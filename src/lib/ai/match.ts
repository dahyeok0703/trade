import { LOW_CONFIDENCE_THRESHOLD, type ExtractionResult } from "@/lib/validations/extraction";
import type { ProductOption } from "@/lib/data/products";

/**
 * One reviewable candidate line. AI provides description/qty/price; the product
 * master fills unit_price/weights/HS code by a DETERMINISTIC name match. Nothing
 * here is auto-applied — the user reviews and edits every row before saving.
 */
export type ExtractedCandidate = {
  description_en: string;
  qty: number;
  unit: string;
  unit_price: number;
  hs_code: string | null;
  net_weight: number | null;
  gross_weight: number | null;
  product_id: string | null;
  matchedProductName: string | null;
  confidence: number;
  needsReview: boolean;
  /** The buyer's original wording (verbatim) — kept so a confirmed line can be
   *  learned as an alias on save. NOT shown as the editable description. */
  source_text: string;
  /** How the product was matched: a learned alias, similarity, or no match. */
  matchedVia: "alias" | "similarity" | null;
};

/** normalized buyer wording → confirmed product_id (a learned alias). */
export type AliasMap = Map<string, string>;

const MATCH_THRESHOLD = 0.34;

/** Confidence assigned to an alias hit (a previously human-confirmed match). */
const ALIAS_CONFIDENCE = 0.97;

/**
 * Normalises buyer wording for alias storage AND lookup — MUST be identical on
 * both sides so a saved alias is found again. Lowercase, strip punctuation,
 * collapse whitespace. (Mirrors the matcher's tokenizer character class.)
 */
export function normalizeSourceText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}

/** Jaccard token overlap + a small substring bonus. */
function similarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  const substr = al.includes(bl) || bl.includes(al) ? 0.2 : 0;
  return Math.min(1, jaccard + substr);
}

function round(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round((v + Number.EPSILON) * f) / f;
}

function bestMatch(description: string, products: ProductOption[]): ProductOption | null {
  let best: ProductOption | null = null;
  let bestScore = 0;
  for (const p of products) {
    const s = similarity(description, p.name_en);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

/**
 * Enrich each extracted item against the product master (rule-based).
 *
 * Matching order, per the learning loop:
 *   1. Learned alias — if this buyer previously confirmed this exact wording
 *      (normalised), reuse that product directly (high confidence, no review).
 *   2. Similarity — fall back to Jaccard token overlap against product names.
 *
 * `aliases` is injected by the caller (route.ts loads it from the DB); this fn
 * stays pure so it's trivially testable and adds no AI calls.
 */
export function matchExtraction(
  extraction: ExtractionResult,
  products: ProductOption[],
  aliases?: AliasMap,
): ExtractedCandidate[] {
  const byId = new Map(products.map((p) => [p.id, p]));

  return extraction.items.map((item) => {
    const sourceText = item.description ?? "";

    // 1) Alias-first: a previously human-confirmed match for this wording.
    let product: ProductOption | null = null;
    let matchedVia: "alias" | "similarity" | null = null;
    const aliasProductId = aliases?.get(normalizeSourceText(sourceText));
    if (aliasProductId) {
      const aliased = byId.get(aliasProductId);
      if (aliased) {
        product = aliased;
        matchedVia = "alias";
      }
    }

    // 2) Similarity fallback when no alias applied.
    if (!product) {
      product = bestMatch(sourceText, products);
      if (product) matchedVia = "similarity";
    }

    const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
    const unitPrice = item.unit_price > 0 ? item.unit_price : (product?.unit_price_usd ?? 0);

    const net = product?.net_weight != null ? round(product.net_weight * qty, 3) : null;
    const gross = product?.gross_weight != null ? round(product.gross_weight * qty, 3) : null;

    // Alias hits are pre-confirmed, so they don't need review — except when the
    // price is genuinely missing (still worth a human glance). Everything else
    // keeps the original confidence/threshold logic.
    const confidence = matchedVia === "alias" ? Math.max(item.confidence, ALIAS_CONFIDENCE) : item.confidence;
    const needsReview =
      matchedVia === "alias"
        ? unitPrice === 0
        : confidence < LOW_CONFIDENCE_THRESHOLD || product === null || unitPrice === 0;

    return {
      description_en: item.description.trim() || (product?.name_en ?? ""),
      qty,
      unit: item.unit?.trim() || product?.unit || "EA",
      unit_price: unitPrice,
      hs_code: product?.hs_code ?? null,
      net_weight: net,
      gross_weight: gross,
      product_id: product?.id ?? null,
      matchedProductName: product?.name_en ?? null,
      confidence,
      needsReview,
      source_text: sourceText,
      matchedVia,
    };
  });
}
