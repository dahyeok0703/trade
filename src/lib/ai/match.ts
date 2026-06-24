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
};

const MATCH_THRESHOLD = 0.34;

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

/** Enrich each extracted item against the product master (rule-based). */
export function matchExtraction(
  extraction: ExtractionResult,
  products: ProductOption[],
): ExtractedCandidate[] {
  return extraction.items.map((item) => {
    const product = bestMatch(item.description, products);
    const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;

    const unitPrice =
      item.unit_price > 0 ? item.unit_price : (product?.unit_price_usd ?? 0);

    const net =
      product?.net_weight != null ? round(product.net_weight * qty, 3) : null;
    const gross =
      product?.gross_weight != null ? round(product.gross_weight * qty, 3) : null;

    const needsReview =
      item.confidence < LOW_CONFIDENCE_THRESHOLD || product === null || unitPrice === 0;

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
      confidence: item.confidence,
      needsReview,
    };
  });
}
