import "server-only";

import { createClient } from "@/lib/supabase/server";
import { loadValidationInputs } from "@/lib/data/validations";
import { logAudit } from "@/lib/audit";
import { runValidation, type ValidationReport } from "@/lib/validation/rules";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Runs the rule engine for a shipment and records the result in `validations`
 * (history). Returns the report. Shared by the validation action and the
 * documents_ready status gate.
 */
export async function runAndRecordValidation(args: {
  workspaceId: string;
  actorMemberId: string;
  shipmentId: string;
}): Promise<ValidationReport> {
  const inputs = await loadValidationInputs(args.shipmentId);
  if (!inputs) throw new Error("수출건을 찾을 수 없습니다.");

  const report = runValidation(inputs);

  const supabase = await createClient();
  await supabase.from("validations").insert({
    workspace_id: args.workspaceId,
    shipment_id: args.shipmentId,
    result: report as unknown as Json,
    passed: report.passed,
  });

  await logAudit({
    workspaceId: args.workspaceId,
    actorMemberId: args.actorMemberId,
    action: "validation.run",
    targetTable: "validations",
    targetId: args.shipmentId,
    meta: {
      passed: report.passed,
      errors: report.summary.errors,
      warnings: report.summary.warnings,
    },
  });

  return report;
}
