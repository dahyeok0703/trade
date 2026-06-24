import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env, features } from "@/lib/env";

/**
 * Anthropic client, or null when no key is configured (graceful degradation —
 * the AI extraction feature is simply hidden/disabled, the app keeps working).
 */
export function createAnthropic(): Anthropic | null {
  if (!features.aiExtraction || !env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}
