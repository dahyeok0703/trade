import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/supabase/database.types";

export type ProductFilters = { q?: string; origin?: string };

/** Live products for the active workspace, with search + origin filter. */
export async function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const supabase = await createClient();
  let q = supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const term = filters.q?.trim().replace(/[%,]/g, "");
  if (term) {
    q = q.or(`name_en.ilike.%${term}%,hs_code.ilike.%${term}%,origin_country.ilike.%${term}%`);
  }
  if (filters.origin) q = q.eq("origin_country", filters.origin);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

/** Distinct origin countries for the filter dropdown. */
export async function listOrigins(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("origin_country")
    .is("deleted_at", null)
    .not("origin_country", "is", null);
  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.origin_country) set.add(row.origin_country);
  }
  return [...set].sort();
}

/**
 * Lightweight product options used to AUTO-FILL a shipment item.
 *
 * This is the autocomplete/prefill source for the shipment 품목 (line item)
 * editor: selecting a product copies its description, HS code, unit, unit price
 * and weights into the new line — all of which remain user-editable afterwards.
 */
export type ProductOption = Pick<
  Product,
  "id" | "name_en" | "hs_code" | "unit" | "unit_price_usd" | "net_weight" | "gross_weight"
>;

export async function listProductOptions(): Promise<ProductOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name_en, hs_code, unit, unit_price_usd, net_weight, gross_weight")
    .is("deleted_at", null)
    .order("name_en", { ascending: true })
    .returns<ProductOption[]>();
  return data ?? [];
}

/** All live products (full rows) for Excel export. */
export async function listAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("name_en", { ascending: true });
  return data ?? [];
}
