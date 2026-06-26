"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError, type ActionContext } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { learnAliases } from "@/lib/data/extraction-aliases";
import {
  shipmentItemSchema,
  updateShipmentItemSchema,
  bulkShipmentItemsSchema,
  type ShipmentItemInput,
} from "@/lib/validations/shipment-item";

const idSchema = z.object({ id: z.string().uuid() });

/** Resolve a shipment's buyer (RLS-scoped) for alias attribution. */
async function shipmentBuyerId(shipmentId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("buyer_id")
    .eq("id", shipmentId)
    .maybeSingle();
  return data?.buyer_id ?? null;
}

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
  // Learn this confirmed match (manual pick counts too) for next time.
  if (rest.product_id) {
    const buyerId = await shipmentBuyerId(shipment_id);
    await learnAliases(ctx.workspaceId, buyerId, [
      { sourceText: rest.source_text ?? rest.description_en, productId: rest.product_id },
    ]);
  }
  revalidateShipment(shipment_id);
  return { id: data.id };
});

/** Insert many reviewed items at once (used by "주문서로 채우기"). */
export const addShipmentItemsBulkAction = authedAction(bulkShipmentItemsSchema, async (input, ctx) => {
  await assertShipment(input.shipment_id);
  const supabase = await createClient();
  const rows = input.items.map((it) => ({
    workspace_id: ctx.workspaceId,
    shipment_id: input.shipment_id,
    ...itemRow(it),
  }));
  const { error, count } = await supabase
    .from("shipment_items")
    .insert(rows, { count: "exact" });

  if (error) throw new ActionError("품목을 추가하지 못했습니다.");

  const inserted = count ?? rows.length;
  await audit(ctx, "shipment_item.bulk_added", input.shipment_id, {
    shipment_id: input.shipment_id,
    count: inserted,
  });

  // Learn every confirmed (buyer wording → product) pair from this batch. The
  // buyer's original wording (source_text) is preserved through the review UI.
  const buyerId = input.buyer_id ?? (await shipmentBuyerId(input.shipment_id));
  await learnAliases(
    ctx.workspaceId,
    buyerId,
    input.items
      .filter((it) => it.product_id)
      .map((it) => ({
        sourceText: it.source_text ?? it.description_en,
        productId: it.product_id ?? null,
      })),
  );

  revalidateShipment(input.shipment_id);
  return { inserted };
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
    // A correction (re-pointing wording at a different product) is a strong
    // learning signal — record it too.
    if (rest.product_id) {
      const buyerId = await shipmentBuyerId(data.shipment_id);
      await learnAliases(ctx.workspaceId, buyerId, [
        { sourceText: rest.source_text ?? rest.description_en, productId: rest.product_id },
      ]);
    }
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
