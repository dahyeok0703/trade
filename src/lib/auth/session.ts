import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isPreview } from "@/lib/env";
import type { Member, Workspace } from "@/lib/supabase/database.types";

/** Current authenticated user, or null. Memoised per request.
 *  Tolerant of an unreachable auth backend (e.g. a StackBlitz preview with a
 *  placeholder Supabase URL) — public pages must still render. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  // Backend-less preview: skip request-scoped cookies() entirely so public
  // pages render statically (WebContainer's AsyncLocalStorage can't reliably
  // hold the request store across the cookies() hop).
  if (isPreview) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});

/** Redirect to /login unless authenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * The membership for the user's active workspace. For now a user belongs to a
 * single workspace (created at sign-up); this returns their first membership.
 */
export const getActiveMembership = cache(
  async (userId: string): Promise<Member | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  },
);

export type WorkspaceContext = {
  user: User;
  member: Member;
  workspace: Workspace;
};

/**
 * Resolves the full workspace context for a protected page, redirecting to
 * /login when unauthenticated. Returns null membership/workspace gracefully if
 * bootstrapping has not completed yet.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const user = await requireUser();
  const member = await getActiveMembership(user.id);
  if (!member) return null;

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", member.workspace_id)
    .maybeSingle();

  if (!workspace) return null;
  return { user, member, workspace };
}
