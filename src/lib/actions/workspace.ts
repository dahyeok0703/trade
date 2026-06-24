"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { exporterInfoSchema } from "@/lib/validations/workspace";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Updates the workspace's exporter info (document header + logo/signature).
 * Owner-only — workspaces UPDATE is owner-only under RLS; we also check the role
 * for a friendly error. Empty fields are dropped from the stored jsonb.
 */
export const updateExporterInfoAction = authedAction(exporterInfoSchema, async (input, ctx) => {
  if (ctx.member.role !== "owner") {
    throw new ActionError("수출자 정보는 관리자(owner)만 수정할 수 있습니다.", "FORBIDDEN");
  }

  const exporterInfo: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.trim() !== "") exporterInfo[key] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ exporter_info: exporterInfo as Json })
    .eq("id", ctx.workspaceId);

  if (error) throw new ActionError("수출자 정보를 저장하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "workspace.exporter_info_updated",
    targetTable: "workspaces",
    targetId: ctx.workspaceId,
  });

  // Documents pull from exporter_info — revalidate the settings page.
  revalidatePath("/settings");
  return { ok: true };
});
