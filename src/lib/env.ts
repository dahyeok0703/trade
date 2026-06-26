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
  // PortOne (billing) — public identifiers used by the browser SDK. Optional.
  NEXT_PUBLIC_PORTONE_STORE_ID: z.string().optional(),
  NEXT_PUBLIC_PORTONE_CHANNEL_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  PORTONE_API_SECRET: z.string().min(1).optional(),
  PORTONE_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Shared secret for scheduled (cron) endpoints. When absent, cron routes are
  // disabled so they cannot be triggered publicly.
  CRON_SECRET: z.string().min(1).optional(),
});

// NEXT_PUBLIC_* must be referenced statically for Next.js to inline them.
const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PORTONE_STORE_ID: process.env.NEXT_PUBLIC_PORTONE_STORE_ID,
  NEXT_PUBLIC_PORTONE_CHANNEL_KEY: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
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
      PORTONE_API_SECRET: process.env.PORTONE_API_SECRET,
      PORTONE_WEBHOOK_SECRET: process.env.PORTONE_WEBHOOK_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
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
  get PORTONE_API_SECRET() {
    return getServerEnv().PORTONE_API_SECRET;
  },
  get PORTONE_WEBHOOK_SECRET() {
    return getServerEnv().PORTONE_WEBHOOK_SECRET;
  },
  get CRON_SECRET() {
    return getServerEnv().CRON_SECRET;
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
  /** PortOne subscription billing. Disabled (UI "준비중") when no API secret. */
  get billing(): boolean {
    return typeof window === "undefined" && Boolean(getServerEnv().PORTONE_API_SECRET);
  },
};

/** Public billing config available on the client (browser SDK identifiers). */
export const billingPublic = {
  storeId: clientEnv.NEXT_PUBLIC_PORTONE_STORE_ID,
  channelKey: clientEnv.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
  get ready(): boolean {
    return Boolean(clientEnv.NEXT_PUBLIC_PORTONE_STORE_ID && clientEnv.NEXT_PUBLIC_PORTONE_CHANNEL_KEY);
  },
};
