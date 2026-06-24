import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Buyer, Shipment, ShipmentItem, ShipmentStatus } from "@/lib/supabase/database.types";

export type ShipmentListRow = Shipment & {
  buyer: Pick<Buyer, "id" | "name_en"> | null;
};

/** Live shipments for the active workspace, with the linked buyer name. */
export async function listShipments(status?: ShipmentStatus): Promise<ShipmentListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("shipments")
    .select("*, buyer:buyers(id, name_en)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q.returns<ShipmentListRow[]>();
  if (error) throw error;
  return data ?? [];
}

export type ShipmentDetail = Shipment & { buyer: Buyer | null };

/** A single live shipment with its full buyer record. */
export async function getShipment(id: string): Promise<ShipmentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*, buyer:buyers(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<ShipmentDetail>();
  return data;
}

/** Line items for a shipment, oldest first (stable document ordering). */
export async function getShipmentItems(shipmentId: string): Promise<ShipmentItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipment_items")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Live buyers as lightweight options for the shipment form's select. */
export async function listBuyerOptions(): Promise<Pick<Buyer, "id" | "name_en">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("buyers")
    .select("id, name_en")
    .is("deleted_at", null)
    .order("name_en", { ascending: true })
    .returns<Pick<Buyer, "id" | "name_en">[]>();
  return data ?? [];
}
