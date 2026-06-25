import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SHIPMENT_STATUS_ORDER } from "@/lib/constants/trade";
import type { ShipmentStatus } from "@/lib/supabase/database.types";

export type Money = { currency: string; amount: number };

export type DashboardData = {
  active: number;
  thisMonthEtd: number;
  receivable: Money[];
  overdue: Money[];
  overdueCount: number;
  byStatus: { status: ShipmentStatus; count: number }[];
  upcoming: { id: string; ref_no: string; buyer: string | null; etd: string | null; status: ShipmentStatus }[];
  warnings: { id: string; ref_no: string; reason: string }[];
  byBuyer: { name: string; amount: number }[];
  byMonth: { month: string; amount: number }[];
};

function addMoney(list: Money[], currency: string, amount: number) {
  const found = list.find((m) => m.currency === currency);
  if (found) found.amount += amount;
  else list.push({ currency, amount });
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [shipmentsRes, buyersRes, itemsRes, paymentsRes, validationsRes] = await Promise.all([
    supabase
      .from("shipments")
      .select("id, ref_no, buyer_id, status, etd, currency")
      .is("deleted_at", null),
    supabase.from("buyers").select("id, name_en").is("deleted_at", null),
    supabase.from("shipment_items").select("shipment_id, amount"),
    supabase.from("payments").select("shipment_id, amount, due_on, paid_on, status"),
    supabase.from("validations").select("shipment_id, passed, run_at"),
  ]);

  const shipments = shipmentsRes.data ?? [];
  const buyerName = new Map((buyersRes.data ?? []).map((b) => [b.id, b.name_en]));

  // Per-shipment invoice total (sum of line amounts) + currency.
  const itemTotal = new Map<string, number>();
  for (const it of itemsRes.data ?? []) {
    itemTotal.set(it.shipment_id, (itemTotal.get(it.shipment_id) ?? 0) + Number(it.amount ?? 0));
  }
  const shipmentCurrency = new Map(shipments.map((s) => [s.id, s.currency]));

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const horizon = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  // ── Status + active ─────────────────────────────────────────────────────────
  const statusCount = new Map<ShipmentStatus, number>();
  for (const s of shipments) {
    statusCount.set(s.status, (statusCount.get(s.status) ?? 0) + 1);
  }
  const active = shipments.filter((s) => s.status !== "done").length;
  const thisMonthEtd = shipments.filter((s) => s.etd && s.etd.startsWith(monthPrefix)).length;

  // ── Upcoming ETD (next 30 days, not done) ────────────────────────────────────
  const upcoming = shipments
    .filter((s) => s.status !== "done" && s.etd && s.etd >= today && s.etd <= horizon)
    .sort((a, b) => (a.etd! < b.etd! ? -1 : 1))
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      ref_no: s.ref_no,
      buyer: s.buyer_id ? (buyerName.get(s.buyer_id) ?? null) : null,
      etd: s.etd,
      status: s.status,
    }));

  // ── Receivable / overdue (by currency) ───────────────────────────────────────
  const receivable: Money[] = [];
  const overdue: Money[] = [];
  let overdueCount = 0;
  for (const p of paymentsRes.data ?? []) {
    const paid = !!p.paid_on || p.status === "paid";
    if (paid) continue;
    const currency = shipmentCurrency.get(p.shipment_id) ?? "USD";
    const amount = Number(p.amount ?? 0);
    addMoney(receivable, currency, amount);
    if (p.due_on && p.due_on < today) {
      addMoney(overdue, currency, amount);
      overdueCount++;
    }
  }

  // ── Warnings: items present but unvalidated or last validation failed ────────
  const latestValidation = new Map<string, { passed: boolean; run_at: string }>();
  for (const v of validationsRes.data ?? []) {
    const prev = latestValidation.get(v.shipment_id);
    if (!prev || v.run_at > prev.run_at) latestValidation.set(v.shipment_id, { passed: v.passed, run_at: v.run_at });
  }
  const warnings = shipments
    .filter((s) => s.status !== "done" && (itemTotal.get(s.id) ?? 0) > 0)
    .map((s) => {
      const v = latestValidation.get(s.id);
      if (!v) return { id: s.id, ref_no: s.ref_no, reason: "서류 미검증" };
      if (!v.passed) return { id: s.id, ref_no: s.ref_no, reason: "검증 불일치" };
      return null;
    })
    .filter((x): x is { id: string; ref_no: string; reason: string } => x !== null)
    .slice(0, 8);

  // ── By buyer (top) ────────────────────────────────────────────────────────────
  const buyerAmount = new Map<string, number>();
  for (const s of shipments) {
    const amt = itemTotal.get(s.id) ?? 0;
    if (amt === 0) continue;
    const name = s.buyer_id ? (buyerName.get(s.buyer_id) ?? "기타") : "미지정";
    buyerAmount.set(name, (buyerAmount.get(name) ?? 0) + amt);
  }
  const byBuyer = [...buyerAmount.entries()]
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // ── By month (ETD month, last 6 months present) ──────────────────────────────
  const monthAmount = new Map<string, number>();
  for (const s of shipments) {
    if (!s.etd) continue;
    const amt = itemTotal.get(s.id) ?? 0;
    if (amt === 0) continue;
    const month = s.etd.slice(0, 7);
    monthAmount.set(month, (monthAmount.get(month) ?? 0) + amt);
  }
  const byMonth = [...monthAmount.entries()]
    .map(([month, amount]) => ({ month, amount: Math.round(amount) }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .slice(-6);

  const byStatus = SHIPMENT_STATUS_ORDER.map((status) => ({
    status,
    count: statusCount.get(status) ?? 0,
  }));

  return {
    active,
    thisMonthEtd,
    receivable,
    overdue,
    overdueCount,
    byStatus,
    upcoming,
    warnings,
    byBuyer,
    byMonth,
  };
}
