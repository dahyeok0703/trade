import { NextResponse, type NextRequest } from "next/server";

import { getBillingAdapter } from "@/lib/billing";
import { recordBillingEvent } from "@/lib/billing/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { BILLING_INTERVAL_DAYS } from "@/lib/billing/plans";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

const WS_RE = /tradedocs-([0-9a-fA-F-]{36})-/;

export async function POST(req: NextRequest) {
  const adapter = getBillingAdapter();
  // Billing disabled → acknowledge so the provider stops retrying.
  if (!adapter) return NextResponse.json({ ok: true, skipped: "disabled" });

  const payload = await req.text();
  const headers: Record<string, string | undefined> = {
    "webhook-id": req.headers.get("webhook-id") ?? undefined,
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? undefined,
    "webhook-signature": req.headers.get("webhook-signature") ?? undefined,
  };

  if (!adapter.verifyWebhook({ payload, headers })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { paymentId?: string } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const paymentId = event.data?.paymentId ?? "";
  const workspaceId = WS_RE.exec(paymentId)?.[1];
  if (!workspaceId) return NextResponse.json({ ok: true, skipped: "no-workspace" });

  // Idempotency + audit log (keyed on the Standard-Webhooks event id).
  const { inserted, available } = await recordBillingEvent({
    workspaceId,
    type: event.type ?? "unknown",
    raw: event as unknown as Json,
    eventId: headers["webhook-id"],
  });
  if (!available) return NextResponse.json({ ok: true, skipped: "no-admin" });
  if (!inserted) return NextResponse.json({ ok: true, deduped: true });

  const type = (event.type ?? "").toLowerCase();
  const isPaid = type.includes("paid");
  const isFailed = type.includes("fail");

  const admin = createAdminClient();
  if (admin && (isPaid || isFailed)) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("cancel_at_period_end")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (isPaid && sub?.cancel_at_period_end) {
      // Canceled at period end → renewal should not extend; downgrade.
      await admin.from("subscriptions").update({ status: "canceled", plan: "free" }).eq("workspace_id", workspaceId);
      await admin.from("workspaces").update({ plan: "free" }).eq("id", workspaceId);
    } else if (isPaid) {
      const periodEnd = new Date(Date.now() + BILLING_INTERVAL_DAYS * 86400000)
        .toISOString()
        .slice(0, 10);
      await admin
        .from("subscriptions")
        .update({ status: "active", plan: "pro", current_period_end: periodEnd })
        .eq("workspace_id", workspaceId);
      await admin.from("workspaces").update({ plan: "pro" }).eq("id", workspaceId);
    } else if (isFailed) {
      await admin.from("subscriptions").update({ status: "past_due" }).eq("workspace_id", workspaceId);
    }
  }

  return NextResponse.json({ ok: true });
}
