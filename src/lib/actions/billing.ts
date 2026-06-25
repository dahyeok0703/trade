"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError, type ActionContext } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { getBillingAdapter } from "@/lib/billing";
import { recordBillingEvent } from "@/lib/billing/events";
import { PRO_PRICE_KRW, BILLING_CURRENCY, BILLING_INTERVAL_DAYS } from "@/lib/billing/plans";
import type { Json } from "@/lib/supabase/database.types";

function requireOwner(ctx: ActionContext) {
  if (ctx.member.role !== "owner") {
    throw new ActionError("결제는 관리자(owner)만 관리할 수 있습니다.", "FORBIDDEN");
  }
}

const subscribeSchema = z.object({
  billingKey: z.string().min(1),
  customerKey: z.string().optional(),
});

/** Issue first charge with the browser-issued billing key, then go Pro. */
export const subscribeAction = authedAction(subscribeSchema, async (input, ctx) => {
  requireOwner(ctx);
  const adapter = getBillingAdapter();
  if (!adapter) throw new ActionError("결제가 준비 중입니다. 잠시 후 다시 시도해 주세요.", "BILLING_DISABLED");

  const paymentId = `tradedocs-${ctx.workspaceId}-${randomUUID()}`;
  const charge = await adapter.payWithBillingKey({
    billingKey: input.billingKey,
    paymentId,
    orderName: "TradeDocs Pro (월 구독)",
    amount: PRO_PRICE_KRW,
    currency: BILLING_CURRENCY,
    customer: { id: ctx.workspaceId },
  });
  if (!charge.ok) {
    throw new ActionError("결제에 실패했습니다. 카드 정보를 확인해 주세요.", "CHARGE_FAILED");
  }

  const card = await adapter.getBillingKeyInfo(input.billingKey);
  const periodEnd = new Date(Date.now() + BILLING_INTERVAL_DAYS * 86400000);

  // Best-effort: schedule the next recurring charge.
  await adapter.scheduleNextPayment({
    billingKey: input.billingKey,
    paymentId: `tradedocs-${ctx.workspaceId}-${randomUUID()}`,
    orderName: "TradeDocs Pro (월 구독)",
    amount: PRO_PRICE_KRW,
    currency: BILLING_CURRENCY,
    customer: { id: ctx.workspaceId },
    timeToPay: periodEnd.toISOString(),
  });

  const supabase = await createClient();
  const { error: subErr } = await supabase.from("subscriptions").upsert(
    {
      workspace_id: ctx.workspaceId,
      provider: adapter.provider,
      plan: "pro",
      status: "active",
      billing_key: input.billingKey,
      customer_key: input.customerKey ?? null,
      card_brand: card?.cardBrand ?? null,
      card_last4: card?.cardLast4 ?? null,
      current_period_end: periodEnd.toISOString().slice(0, 10),
      cancel_at_period_end: false,
      canceled_at: null,
    },
    { onConflict: "workspace_id" },
  );
  if (subErr) throw new ActionError("구독 정보를 저장하지 못했습니다.");

  const { error: planErr } = await supabase
    .from("workspaces")
    .update({ plan: "pro" })
    .eq("id", ctx.workspaceId);
  if (planErr) throw new ActionError("플랜을 변경하지 못했습니다.");

  await recordBillingEvent({
    workspaceId: ctx.workspaceId,
    type: "subscription.created",
    raw: { amount: PRO_PRICE_KRW, currency: BILLING_CURRENCY, card_last4: card?.cardLast4 } as Json,
  });
  await audit(ctx, "subscription.created");

  revalidatePath("/billing");
  revalidatePath("/", "layout");
  return { ok: true };
});

/** Cancel at period end — keeps Pro until current_period_end. */
export const cancelSubscriptionAction = authedAction(z.object({}), async (_input, ctx) => {
  requireOwner(ctx);
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() })
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw new ActionError("구독을 취소하지 못했습니다.");

  await recordBillingEvent({ workspaceId: ctx.workspaceId, type: "subscription.canceled", raw: {} });
  await audit(ctx, "subscription.canceled");
  revalidatePath("/billing");
  return { ok: true };
});

/** Resume a subscription that was set to cancel at period end. */
export const resumeSubscriptionAction = authedAction(z.object({}), async (_input, ctx) => {
  requireOwner(ctx);
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ cancel_at_period_end: false, canceled_at: null })
    .eq("workspace_id", ctx.workspaceId);
  if (error) throw new ActionError("구독을 재개하지 못했습니다.");

  await recordBillingEvent({ workspaceId: ctx.workspaceId, type: "subscription.resumed", raw: {} });
  await audit(ctx, "subscription.resumed");
  revalidatePath("/billing");
  return { ok: true };
});

function audit(ctx: ActionContext, action: string) {
  return logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action,
    targetTable: "subscriptions",
    targetId: ctx.workspaceId,
  });
}
