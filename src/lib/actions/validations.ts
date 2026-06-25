"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { runAndRecordValidation } from "@/lib/validation/run";
import { assertCanRunValidation } from "@/lib/billing/gate";

const idSchema = z.object({ id: z.string().uuid() });
const readySchema = z.object({ id: z.string().uuid(), force: z.boolean().optional() });

/** Run the rule-based consistency check and store the result. */
export const runValidationAction = authedAction(idSchema, async ({ id }, ctx) => {
  const supabase = await createClient();
  await assertCanRunValidation(supabase, ctx.workspaceId);
  const report = await runAndRecordValidation({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    shipmentId: id,
  });
  revalidatePath(`/shipments/${id}`);
  return { report };
});

/**
 * Advance a shipment to `documents_ready`. Re-validates first; blocks (returns
 * outcome "blocked" + report) when there are errors, unless `force` is set —
 * "경고 후 강제 진행은 가능".
 */
export const markDocumentsReadyAction = authedAction(readySchema, async ({ id, force }, ctx) => {
  const report = await runAndRecordValidation({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    shipmentId: id,
  });

  if (!report.passed && !force) {
    return { outcome: "blocked" as const, report };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shipments")
    .update({ status: "documents_ready" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new ActionError("상태를 변경하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: report.passed ? "shipment.documents_ready" : "shipment.documents_ready_forced",
    targetTable: "shipments",
    targetId: id,
    meta: { forced: !report.passed },
  });

  revalidatePath(`/shipments/${id}`);
  revalidatePath("/shipments");
  return { outcome: "advanced" as const, report };
});
