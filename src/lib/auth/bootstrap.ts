import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Turn a company name into a url-safe slug with a short unique suffix. */
function toSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "workspace"}-${suffix}`;
}

/**
 * Ensures the signed-in user has a workspace + owner membership.
 *
 * Idempotent: returns early if a membership already exists. Relies on the
 * `bootstrap_workspace` SECURITY DEFINER function so it works without the
 * service-role key. Safe to call after both sign-up and sign-in.
 */
export async function ensureWorkspace(companyName?: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const name =
    companyName?.trim() ||
    (typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : "") ||
    "내 회사";

  const { error } = await supabase.rpc("bootstrap_workspace", {
    workspace_name: name,
    workspace_slug: toSlug(name),
  });

  if (error) {
    console.error("[bootstrap] failed to create workspace", error);
  }
}
