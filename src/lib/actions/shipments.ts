"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError, type ActionContext } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { runAndRecordValidation } from "@/lib/validation/run";
import { shipmentSchema } from "@/lib/validations/shipment";

const idSchema = z.object({ id: z.string().uuid() });
const updateShipmentSchema = shipmentSchema.extend({ id: z.string().uuid() });
const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "documents_ready", "shipped", "done"]),
});

/** Reject a buyer_id that is not a live buyer in this workspace (RLS-scoped). */
async function assertBuyerInWorkspace(buyerId: string | undefined): Promise<void> {
  if (!buyerId) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("buyers")
    .select("id")
    .eq("id", buyerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new ActionError("선택한 바이어를 찾을 수 없습니다.");
}

function toRow(input: z.infer<typeof shipmentSchema>) {
  return {
    ref_no: input.ref_no,
    buyer_id: input.buyer_id ?? null,
    incoterms: input.incoterms ?? null,
    currency: input.currency,
    port_of_loading: input.port_of_loading ?? null,
    port_of_discharge: input.port_of_discharge ?? null,
    etd: input.etd ?? null,
    eta: input.eta ?? null,
    lc_no: input.lc_no ?? null,
    bl_no: input.bl_no ?? null,
    payment_terms: input.payment_terms ?? null,
    memo: input.memo ?? null,
  };
}

export const createShipmentAction = authedAction(shipmentSchema, async (input, ctx) => {
  await assertBuyerInWorkspace(input.buyer_id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipments")
    .insert({ workspace_id: ctx.workspaceId, ...toRow(input) })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ActionError("이미 사용 중인 Ref No 입니다.", "DUPLICATE_REF");
    }
    throw new ActionError("수출건을 등록하지 못했습니다.");
  }

  await auditShipment(ctx, "shipment.created", data.id, { ref_no: input.ref_no });
  revalidatePath("/shipments");
  return { id: data.id };
});

export const updateShipmentAction = authedAction(updateShipmentSchema, async (input, ctx) => {
  await assertBuyerInWorkspace(input.buyer_id);
  const supabase = await createClient();
  const { id, ...rest } = input;
  const { error } = await supabase
    .from("shipments")
    .update(toRow(rest))
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "23505") {
      throw new ActionError("이미 사용 중인 Ref No 입니다.", "DUPLICATE_REF");
    }
    throw new ActionError("수출건을 수정하지 못했습니다.");
  }

  await auditShipment(ctx, "shipment.updated", id);
  revalidatePath("/shipments");
  revalidatePath(`/shipments/${id}`);
  return { id };
});

export const updateShipmentStatusAction = authedAction(updateStatusSchema, async (input, ctx) => {
  // Gate: a shipment can only reach "서류 준비 완료" when consistency checks pass.
  // (Forced override goes through markDocumentsReadyAction in the 일치검증 탭.)
  if (input.status === "documents_ready") {
    const report = await runAndRecordValidation({
      workspaceId: ctx.workspaceId,
      actorMemberId: ctx.member.id,
      shipmentId: input.id,
    });
    if (!report.passed) {
      throw new ActionError(
        "일치검증에 실패한 항목이 있어 '서류 준비 완료'로 전환할 수 없습니다. 일치검증 탭에서 확인 후 진행하세요.",
        "VALIDATION_REQUIRED",
      );
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shipments")
    .update({ status: input.status })
    .eq("id", input.id)
    .is("deleted_at", null);

  if (error) throw new ActionError("상태를 변경하지 못했습니다.");

  await auditShipment(ctx, "shipment.status_changed", input.id, { status: input.status });
  revalidatePath("/shipments");
  revalidatePath(`/shipments/${input.id}`);
  return { id: input.id, status: input.status };
});

export const deleteShipmentAction = authedAction(idSchema, async ({ id }, ctx) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new ActionError("수출건을 삭제하지 못했습니다.");

  await auditShipment(ctx, "shipment.deleted", id);
  revalidatePath("/shipments");
  return { id };
});

function auditShipment(
  ctx: ActionContext,
  action: string,
  targetId: string,
  meta?: Record<string, unknown>,
) {
  return logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action,
    targetTable: "shipments",
    targetId,
    meta: meta as never,
  });
}
