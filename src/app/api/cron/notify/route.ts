import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Always run fresh; never cache a scheduled digest.
export const dynamic = "force-dynamic";

/** Days ahead to flag upcoming ETD / due payments. */
const HORIZON_DAYS = 3;

/**
 * Scheduled digest of upcoming ETDs and due/overdue payments.
 *
 * Registered as a Vercel Cron (see vercel.json). Secured by CRON_SECRET:
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`. When CRON_SECRET is unset
 * the endpoint is disabled (503) so it can never be triggered publicly.
 *
 * Delivery: this computes the digest cross-workspace via the service role. A
 * real email/Slack channel is not yet wired, so the digest is returned as JSON
 * and logged — graceful degradation. Wire a provider (e.g. Resend) here to send.
 */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "cron_disabled" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, reason: "service_role_unavailable" }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + HORIZON_DAYS * 86_400_000).toISOString().slice(0, 10);

  const [etdRes, dueRes] = await Promise.all([
    admin
      .from("shipments")
      .select("workspace_id, ref_no, etd, status")
      .is("deleted_at", null)
      .not("etd", "is", null)
      .gte("etd", today)
      .lte("etd", horizon)
      .in("status", ["draft", "documents_ready"]),
    admin
      .from("payments")
      .select("workspace_id, shipment_id, amount, due_on, status")
      .is("paid_on", null)
      .not("due_on", "is", null)
      .lte("due_on", horizon),
  ]);

  const upcomingEtd = etdRes.data ?? [];
  const duePayments = dueRes.data ?? [];
  const overdue = duePayments.filter((p) => p.due_on != null && p.due_on < today);
  const dueSoon = duePayments.filter((p) => p.due_on != null && p.due_on >= today);

  const digest = {
    generatedFor: today,
    horizonDays: HORIZON_DAYS,
    upcomingEtd: upcomingEtd.length,
    overduePayments: overdue.length,
    paymentsDueSoon: dueSoon.length,
  };

  // No delivery channel configured yet → log + return. (TODO: send via provider.)
  console.info("[cron/notify] digest", JSON.stringify(digest));

  return NextResponse.json({ ok: true, delivered: false, digest });
}
