import { FREE_MONTHLY_EXTRACT_QUOTA } from "@/lib/pricing/cogs";
import type { WorkspacePlan } from "@/lib/supabase/database.types";

/**
 * Plan configuration — limits + price. Prices are config values (KRW), set here
 * (override per environment as needed). Free is gated; Pro lifts the limits.
 *
 * Margin note: the Pro AI quota (aiExtractionsPerMonth) is bounded so the worst-
 * case extraction COGS (see lib/pricing/cogs.ts) stays well under the Pro price.
 * Owners see actual AI cost on Settings; tighten the quota if margins slip.
 */

export type PlanLimits = {
  /** null = unlimited */
  maxShipments: number | null;
  aiExtractionsPerMonth: number;
  validationsPerMonth: number | null;
  documentWatermark: boolean;
};

export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  free: {
    maxShipments: 5,
    aiExtractionsPerMonth: FREE_MONTHLY_EXTRACT_QUOTA, // 20
    validationsPerMonth: 50,
    documentWatermark: true,
  },
  pro: {
    maxShipments: null,
    aiExtractionsPerMonth: 1000,
    validationsPerMonth: null,
    documentWatermark: false,
  },
};

export function planLimits(plan: WorkspacePlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/** Pro subscription price (config). KRW, charged monthly via PortOne. */
export const PRO_PRICE_KRW = 49_000;
export const BILLING_CURRENCY = "KRW";
export const BILLING_INTERVAL_DAYS = 30;

export type PlanFeature = { label: string; free: string; pro: string };

/** Marketing copy for /pricing. */
export const PLAN_FEATURES: PlanFeature[] = [
  { label: "수출 건", free: `${PLAN_LIMITS.free.maxShipments}건`, pro: "무제한" },
  {
    label: "AI 주문서 추출",
    free: `월 ${PLAN_LIMITS.free.aiExtractionsPerMonth}회`,
    pro: `월 ${PLAN_LIMITS.pro.aiExtractionsPerMonth}회`,
  },
  { label: "서류 일치검증", free: `월 ${PLAN_LIMITS.free.validationsPerMonth}회`, pro: "무제한" },
  { label: "서류 PDF", free: "워터마크 표시", pro: "워터마크 없음" },
];
