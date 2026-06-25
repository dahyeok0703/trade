import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/lib/supabase/database.types";

/** Payments for a shipment, due date first. */
export async function getPayments(shipmentId: string): Promise<Payment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("due_on", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
