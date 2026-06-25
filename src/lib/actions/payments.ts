"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError, type ActionContext } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { paymentSchema, updatePaymentSchema, type PaymentInput } from "@/lib/validations/payment";

const idSchema = z.object({ id: z.string().uuid() });

const today = () => new Date().toISOString().slice(0, 10);

/** Keeps status/paid_on consistent: paid ⇒ has a paid date, and vice-versa. */
function toRow(input: Omit<PaymentInput, "shipment_id">) {
  let status = input.status;
  let paidOn = input.paid_on ?? null;
  if (status === "paid" && !paidOn) paidOn = today();
  if (paidOn) status = "paid";
  return {
    term: input.term,
    amount: input.amount,
    due_on: input.due_on ?? null,
    paid_on: paidOn,
    status,
  };
}

async function assertShipment(shipmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("id")
    .eq("id", shipmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new ActionError("수출건을 찾을 수 없습니다.");
}

export const addPaymentAction = authedAction(paymentSchema, async (input, ctx) => {
  await assertShipment(input.shipment_id);
  const { shipment_id, ...rest } = input;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({ workspace_id: ctx.workspaceId, shipment_id, ...toRow(rest) })
    .select("id")
    .single();
  if (error || !data) throw new ActionError("대금을 추가하지 못했습니다.");
  await audit(ctx, "payment.added", data.id, shipment_id);
  revalidate(shipment_id);
  return { id: data.id };
});

export const updatePaymentAction = authedAction(updatePaymentSchema, async (input, ctx) => {
  const { id, ...rest } = input;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .update(toRow(rest))
    .eq("id", id)
    .select("shipment_id")
    .single();
  if (error || !data) throw new ActionError("대금을 수정하지 못했습니다.");
  await audit(ctx, "payment.updated", id, data.shipment_id);
  revalidate(data.shipment_id);
  return { id };
});

export const deletePaymentAction = authedAction(idSchema, async ({ id }, ctx) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .select("shipment_id")
    .single();
  if (error || !data) throw new ActionError("대금을 삭제하지 못했습니다.");
  await audit(ctx, "payment.deleted", id, data.shipment_id);
  revalidate(data.shipment_id);
  return { id };
});

function revalidate(shipmentId: string) {
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/dashboard");
}

function audit(ctx: ActionContext, action: string, targetId: string, shipmentId: string) {
  return logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action,
    targetTable: "payments",
    targetId,
    meta: { shipment_id: shipmentId } as never,
  });
}
