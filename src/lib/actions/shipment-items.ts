"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError, type ActionContext } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import {
  shipmentItemSchema,
  updateShipmentItemSchema,
  type ShipmentItemInput,
} from "@/lib/validations/shipment-item";

const idSchema = z.object({ id: z.string().uuid() });

/** Round to 2dp the same way invoices present money. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** amount is ALWAYS derived (qty × unit_price) — never trusted from the client. */
function itemRow(input: Omit<ShipmentItemInput, "shipment_id">) {
  return {
    product_id: input.product_id ?? null,
    description_en: input.description_en,
    hs_code: input.hs_code ?? null,
    unit: input.unit,
    qty: input.qty,
    unit_price: input.unit_price,
    amount: round2(input.qty * input.unit_price),
    net_weight: input.net_weight ?? null,
    gross_weight: input.gross_weight ?? null,
    ctns: input.ctns ?? null,
    cbm: input.cbm ?? null,
  };
}

/** Verify the shipment is a live shipment in this workspace (RLS-scoped). */
async function assertShipment(shipmentId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("id")
    .eq("id", shipmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new ActionError("수출건을 찾을 수 없습니다.");
}

export const addShipmentItemAction = authedAction(shipmentItemSchema, async (input, ctx) => {
  await assertShipment(input.shipment_id);
  const { shipment_id, ...rest } = input;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipment_items")
    .insert({ workspace_id: ctx.workspaceId, shipment_id, ...itemRow(rest) })
    .select("id")
    .single();

  if (error || !data) throw new ActionError("품목을 추가하지 못했습니다.");

  await audit(ctx, "shipment_item.added", data.id, { shipment_id });
  revalidateShipment(shipment_id);
  return { id: data.id };
});

export const updateShipmentItemAction = authedAction(
  updateShipmentItemSchema,
  async (input, ctx) => {
    const { id, ...rest } = input;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shipment_items")
      .update(itemRow(rest))
      .eq("id", id)
      .select("shipment_id")
      .single();

    if (error || !data) throw new ActionError("품목을 수정하지 못했습니다.");

    await audit(ctx, "shipment_item.updated", id, { shipment_id: data.shipment_id });
    revalidateShipment(data.shipment_id);
    return { id };
  },
);

export const deleteShipmentItemAction = authedAction(idSchema, async ({ id }, ctx) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipment_items")
    .delete()
    .eq("id", id)
    .select("shipment_id")
    .single();

  if (error || !data) throw new ActionError("품목을 삭제하지 못했습니다.");

  await audit(ctx, "shipment_item.deleted", id, { shipment_id: data.shipment_id });
  revalidateShipment(data.shipment_id);
  return { id };
});

function revalidateShipment(shipmentId: string) {
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath(`/shipments/${shipmentId}/invoice`);
  revalidatePath(`/shipments/${shipmentId}/packing-list`);
}

function audit(ctx: ActionContext, action: string, targetId: string, meta: Record<string, unknown>) {
  return logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action,
    targetTable: "shipment_items",
    targetId,
    meta: meta as never,
  });
}
