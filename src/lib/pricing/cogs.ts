/**
 * Cost-of-goods-sold for AI extraction — margin protection.
 *
 * Token prices are USD per 1,000,000 tokens (Anthropic list price). We convert
 * to KRW with a configurable rate so the workspace owner can see estimated cost
 * per month in `ai_usage.est_cost_krw`. These are ESTIMATES for margin tracking,
 * not billing figures.
 */

export const EXTRACTION_MODEL = "claude-haiku-4-5" as const;
export const FALLBACK_MODEL = "claude-sonnet-4-6" as const;

export type PricedModel = typeof EXTRACTION_MODEL | typeof FALLBACK_MODEL;

type ModelPrice = {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
};

export const MODEL_PRICING: Record<PricedModel, ModelPrice> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
};

/** USD → KRW. Override via env in a real deployment; rounded constant here. */
export const USD_TO_KRW = 1350;

/** Free plan: extractions allowed per calendar month before the quota blocks. */
export const FREE_MONTHLY_EXTRACT_QUOTA = 20;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
};

/**
 * Estimated KRW cost for one model call. Cache reads bill ~0.1×, cache writes
 * ~1.25× the input rate; uncached input + output at list price.
 */
export function estimateCostKrw(model: PricedModel, usage: TokenUsage): number {
  const price = MODEL_PRICING[model];
  const inPerToken = price.input / 1_000_000;
  const outPerToken = price.output / 1_000_000;

  const usd =
    usage.inputTokens * inPerToken +
    (usage.cacheReadInputTokens ?? 0) * inPerToken * 0.1 +
    (usage.cacheCreationInputTokens ?? 0) * inPerToken * 1.25 +
    usage.outputTokens * outPerToken;

  return Math.round(usd * USD_TO_KRW * 100) / 100;
}

/** Sum two usage records (e.g. Haiku attempt + Sonnet fallback). */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadInputTokens: (a.cacheReadInputTokens ?? 0) + (b.cacheReadInputTokens ?? 0),
    cacheCreationInputTokens:
      (a.cacheCreationInputTokens ?? 0) + (b.cacheCreationInputTokens ?? 0),
  };
}
