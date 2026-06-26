import "server-only";

import { createClient } from "@/lib/supabase/server";
import { normalizeSourceText, type AliasMap } from "@/lib/ai/match";

/*
 * Extraction memory — the read/write helpers behind the "쓸수록 똑똑해지는"
 * learning loop. Everything here is workspace-scoped TWICE: RLS on the table is
 * the primary guard, and every query/RPC also passes workspace_id explicitly so
 * an alias can never be read or written across tenants.
 *
 * Aliases reference the product master only; they add NO AI calls — matching
 * consults this memory first (a free DB lookup) and falls back to similarity.
 */

type AliasRow = { source_text: string; product_id: string; buyer_id: string | null };

/**
 * Loads the learned aliases for (workspace, buyer) into a lookup map keyed by
 * normalised wording. Buyer-specific aliases win over workspace-wide (global)
 * ones. Only aliases whose product is still live are included.
 */
export async function loadAliasMap(workspaceId: string, buyerId: string | null): Promise<AliasMap> {
  const supabase = await createClient();
  let query = supabase
    .from("extraction_aliases")
    .select("source_text, product_id, buyer_id")
    .eq("workspace_id", workspaceId);

  query = buyerId ? query.or(`buyer_id.eq.${buyerId},buyer_id.is.null`) : query.is("buyer_id", null);

  const { data, error } = await query.returns<AliasRow[]>();
  if (error || !data) return new Map();
  // Note: an alias may point at a since-deleted product; matchExtraction only
  // applies aliases whose product is still live (its byId map), so no filter
  // is needed here — keeping this query embed-free and robust.

  const global = new Map<string, string>();
  const specific = new Map<string, string>();
  for (const row of data) {
    const key = normalizeSourceText(row.source_text);
    if (!key) continue;
    if (row.buyer_id === null) global.set(key, row.product_id);
    else specific.set(key, row.product_id);
  }
  // Buyer-specific overrides global.
  const map: AliasMap = new Map(global);
  for (const [k, v] of specific) map.set(k, v);
  return map;
}

export type AliasHint = { source_text: string; product_name: string };

/**
 * Top learned aliases for a buyer (by reuse count) — used as a light prompt
 * hint ("this buyer's past items") to nudge extraction toward known wording.
 */
export async function topAliasesForBuyer(
  workspaceId: string,
  buyerId: string | null,
  limit = 8,
): Promise<AliasHint[]> {
  const supabase = await createClient();
  let query = supabase
    .from("extraction_aliases")
    .select("source_text, times_seen, products!inner(name_en, deleted_at)")
    .eq("workspace_id", workspaceId)
    .is("products.deleted_at", null);

  query = buyerId ? query.or(`buyer_id.eq.${buyerId},buyer_id.is.null`) : query.is("buyer_id", null);

  const { data } = await query
    .order("times_seen", { ascending: false })
    .limit(limit)
    .returns<{ source_text: string; times_seen: number; products: { name_en: string } }[]>();

  return (data ?? []).map((r) => ({ source_text: r.source_text, product_name: r.products.name_en }));
}

/**
 * Records confirmed/corrected matches as aliases (best-effort; never throws).
 * Upsert + times_seen increment happen atomically in the DB function.
 */
export async function learnAliases(
  workspaceId: string,
  buyerId: string | null,
  entries: { sourceText: string; productId: string | null }[],
): Promise<void> {
  const payload = entries
    .filter((e) => e.productId)
    .map((e) => ({ source_text: normalizeSourceText(e.sourceText), product_id: e.productId }))
    .filter((e) => e.source_text.length > 0);
  if (payload.length === 0) return;

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("learn_extraction_aliases", {
      p_workspace_id: workspaceId,
      p_buyer_id: buyerId,
      p_entries: payload,
    });
    if (error) console.error("[aliases] learn failed", error);
  } catch (err) {
    console.error("[aliases] learn unexpected error", err);
  }
}

export type AliasInsights = {
  aliasCount: number;
  /** Times a learned alias was re-confirmed (sum(times_seen) − aliasCount). */
  reuseCount: number;
  buyersCovered: number;
};

/** Aggregate stats showing the memory growing — for the insight card. */
export async function getAliasInsights(workspaceId: string): Promise<AliasInsights> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("extraction_aliases")
    .select("buyer_id, times_seen")
    .eq("workspace_id", workspaceId)
    .returns<{ buyer_id: string | null; times_seen: number }[]>();

  const rows = data ?? [];
  const totalSeen = rows.reduce((sum, r) => sum + (r.times_seen ?? 0), 0);
  const buyers = new Set(rows.filter((r) => r.buyer_id !== null).map((r) => r.buyer_id));
  return {
    aliasCount: rows.length,
    reuseCount: Math.max(0, totalSeen - rows.length),
    buyersCovered: buyers.size,
  };
}
