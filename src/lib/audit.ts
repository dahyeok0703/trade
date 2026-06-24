import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type AuditEntry = {
  workspaceId: string;
  actorMemberId: string;
  action: string;
  targetTable: string;
  targetId?: string | null;
  meta?: Json;
};

/**
 * Appends an audit_logs row. Best-effort: a logging failure must never break
 * the user-facing action, so errors are swallowed (and surfaced in server
 * logs). RLS allows any active member to insert into their workspace.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("audit_logs").insert({
      workspace_id: entry.workspaceId,
      actor_member_id: entry.actorMemberId,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId ?? null,
      meta: entry.meta ?? {},
    });
    if (error) console.error("[audit] insert failed", error);
  } catch (err) {
    console.error("[audit] unexpected error", err);
  }
}
