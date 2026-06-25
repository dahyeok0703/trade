import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SubscriptionView = {
  status: string;
  provider: string;
  card_brand: string | null;
  card_last4: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

/** Subscription for the workspace (owner-only). Never exposes the billing key. */
export async function getSubscription(workspaceId: string): Promise<SubscriptionView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, provider, card_brand, card_last4, current_period_end, cancel_at_period_end, canceled_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data;
}

export type BillingEventView = { id: string; type: string; created_at: string };

/** Recent billing events (owner-only). */
export async function listBillingEvents(workspaceId: string): Promise<BillingEventView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("billing_events")
    .select("id, type, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
