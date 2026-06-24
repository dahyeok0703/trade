import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getShipment, getShipmentItems } from "@/lib/data/shipments";
import type { ValidationInputs, ValidationReport } from "@/lib/validation/rules";

/** Loads everything the rule engine needs for one shipment (RLS-scoped). */
export async function loadValidationInputs(shipmentId: string): Promise<ValidationInputs | null> {
  const [shipment, items] = await Promise.all([
    getShipment(shipmentId),
    getShipmentItems(shipmentId),
  ]);
  if (!shipment) return null;

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", shipment.workspace_id)
    .maybeSingle();
  if (!workspace) return null;

  return { workspace, shipment, buyer: shipment.buyer, items };
}

export type StoredValidation = {
  result: ValidationReport;
  passed: boolean;
  run_at: string;
};

/** Most recent validation run for a shipment, or null. */
export async function getLatestValidation(shipmentId: string): Promise<StoredValidation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("validations")
    .select("result, passed, run_at")
    .eq("shipment_id", shipmentId)
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    result: data.result as unknown as ValidationReport,
    passed: data.passed,
    run_at: data.run_at,
  };
}
