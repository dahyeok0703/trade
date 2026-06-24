import { z } from "zod";

/**
 * Centralised, validated environment access.
 *
 * - Server values are parsed lazily so that importing this module in the browser
 *   bundle never throws (only NEXT_PUBLIC_* values are inlined client-side).
 * - Optional keys (e.g. AI) degrade gracefully: when absent, the corresponding
 *   feature flag is simply `false` rather than crashing the app.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required",
  }),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
});

// NEXT_PUBLIC_* must be referenced statically for Next.js to inline them.
const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("Server env accessed in the browser. This is a bug.");
  }
  if (!cachedServerEnv) {
    cachedServerEnv = serverSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    });
  }
  return cachedServerEnv;
}

export const env = {
  ...clientEnv,
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get ANTHROPIC_API_KEY() {
    return getServerEnv().ANTHROPIC_API_KEY;
  },
};

/** Feature flags derived from optional keys. Safe to call on the server. */
export const features = {
  /** AI line-item extraction. Disabled when no key is configured. */
  get aiExtraction(): boolean {
    return typeof window === "undefined" && Boolean(getServerEnv().ANTHROPIC_API_KEY);
  },
  /** Admin (service-role) operations such as workspace bootstrapping. */
  get serviceRole(): boolean {
    return typeof window === "undefined" && Boolean(getServerEnv().SUPABASE_SERVICE_ROLE_KEY);
  },
};
