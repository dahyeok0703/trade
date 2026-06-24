import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Buyer } from "@/lib/supabase/database.types";

/** Live buyers for the active workspace, optionally filtered by a search term. */
export async function listBuyers(query?: string): Promise<Buyer[]> {
  const supabase = await createClient();
  let q = supabase
    .from("buyers")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const term = query?.trim().replace(/[%,]/g, "");
  if (term) {
    q = q.or(`name_en.ilike.%${term}%,country.ilike.%${term}%,address_en.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** A single live buyer, or null if not found / soft-deleted. */
export async function getBuyer(id: string): Promise<Buyer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("buyers")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}
