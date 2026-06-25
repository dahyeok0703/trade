import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Records a billing_events row via the service role (the table is owner-read /
 * system-write). When `eventId` is set, the row is idempotent — a duplicate
 * event id is ignored. Returns whether a NEW row was written (the webhook uses
 * this as its idempotency gate). No-op (false) when no service-role key.
 */
export async function recordBillingEvent(args: {
  workspaceId: string;
  type: string;
  raw: Json;
  eventId?: string | null;
}): Promise<{ inserted: boolean; available: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { inserted: false, available: false };

  const { data, error } = await admin
    .from("billing_events")
    .upsert(
      {
        workspace_id: args.workspaceId,
        type: args.type,
        raw: args.raw,
        event_id: args.eventId ?? null,
      },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    console.error("[billing] recordBillingEvent failed", error);
    return { inserted: false, available: true };
  }
  return { inserted: (data?.length ?? 0) > 0, available: true };
}
