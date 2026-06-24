import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TradeDocType } from "@/lib/supabase/database.types";

export type IssuedDocument = {
  id: string;
  doc_type: TradeDocType;
  doc_no: string | null;
  issued_on: string | null;
  created_at: string;
};

/** Issuance history for a shipment, newest first. */
export async function listIssuedDocuments(shipmentId: string): Promise<IssuedDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_documents")
    .select("id, doc_type, doc_no, issued_on, created_at")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
