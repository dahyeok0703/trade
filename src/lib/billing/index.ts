import "server-only";

import { env, features } from "@/lib/env";
import { PortOneAdapter } from "@/lib/billing/portone";
import type { BillingAdapter } from "@/lib/billing/types";

/**
 * Returns the active billing adapter, or null when billing isn't configured
 * (no PortOne API secret) — callers then show "준비중" and the app keeps working.
 */
export function getBillingAdapter(): BillingAdapter | null {
  if (!features.billing || !env.PORTONE_API_SECRET) return null;
  return new PortOneAdapter(env.PORTONE_API_SECRET, env.PORTONE_WEBHOOK_SECRET);
}

export type { BillingAdapter } from "@/lib/billing/types";
