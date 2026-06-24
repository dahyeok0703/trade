import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env, features } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client that BYPASSES Row Level Security.
 *
 * Use sparingly and only on the server for privileged bootstrapping that cannot
 * be expressed under RLS (e.g. creating a workspace + owner membership during
 * sign-up). Returns `null` when no service-role key is configured so callers can
 * degrade gracefully.
 */
export function createAdminClient() {
  if (!features.serviceRole || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
