import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/session";
import type { Member } from "@/lib/supabase/database.types";
import { fail, ok, type ActionResult } from "@/lib/actions/result";

/**
 * Wraps a Server Action so it always returns `{ ok, data, error }`.
 *
 * - Validates raw input with the provided zod schema (field errors are surfaced
 *   in the failure envelope).
 * - `authedAction` additionally resolves the current user + active workspace
 *   membership and passes it to the handler, so every mutation is scoped to a
 *   `workspace_id` and backed by RLS.
 * - Unexpected throws are caught and converted into a generic failure; raw
 *   errors are never leaked to the client.
 */

export type ActionContext = {
  userId: string;
  member: Member;
  workspaceId: string;
};

export function action<S extends z.ZodTypeAny, TOutput>(
  schema: S,
  handler: (input: z.infer<S>) => Promise<TOutput>,
) {
  return async (raw: unknown): Promise<ActionResult<TOutput>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail("입력값을 확인해 주세요.", {
        code: "VALIDATION",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }
    try {
      return ok(await handler(parsed.data));
    } catch (err) {
      return toFailure(err);
    }
  };
}

export function authedAction<S extends z.ZodTypeAny, TOutput>(
  schema: S,
  handler: (input: z.infer<S>, ctx: ActionContext) => Promise<TOutput>,
) {
  return async (raw: unknown): Promise<ActionResult<TOutput>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return fail("입력값을 확인해 주세요.", {
        code: "VALIDATION",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return fail("로그인이 필요합니다.", { code: "UNAUTHENTICATED" });
      }

      const member = await getActiveMembership(user.id);
      if (!member) {
        return fail("워크스페이스 접근 권한이 없습니다.", { code: "NO_WORKSPACE" });
      }

      return ok(
        await handler(parsed.data, {
          userId: user.id,
          member,
          workspaceId: member.workspace_id,
        }),
      );
    } catch (err) {
      return toFailure(err);
    }
  };
}

function toFailure(err: unknown): ActionResult<never> {
  if (err instanceof ActionError) {
    return fail(err.message, { code: err.code });
  }
  // Never leak internal error details to the client.
  console.error("[action] unexpected error", err);
  return fail("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", { code: "INTERNAL" });
}

/** Throw inside a handler to return a controlled, user-facing failure. */
export class ActionError extends Error {
  code: string;
  constructor(message: string, code = "ACTION_ERROR") {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}
