import { z } from "zod";

/**
 * Schema the model is constrained to (structured outputs). Kept to plain types
 * — JSON-schema constraints like min/max aren't supported by structured outputs.
 * The model EXTRACTS line items only; it does not judge prices or decide trade.
 * `confidence` is extraction metadata (0–1), not a recommendation.
 */
export const extractionSchema = z.object({
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unit_price: z.number(),
      currency: z.string(),
      confidence: z.number(),
    }),
  ),
  overall_confidence: z.number(),
  notes: z.string(),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

/** Below this, an item is flagged "확인 필요" in the review UI. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;
