import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ActionError } from "@/lib/actions/safe-action";
import { planLimits } from "@/lib/billing/plans";
import type { Database, WorkspacePlan } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export async function getWorkspacePlan(supabase: DB, workspaceId: string): Promise<WorkspacePlan> {
  const { data } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .maybeSingle();
  return (data?.plan ?? "free") as WorkspacePlan;
}

function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Free plan caps the number of live shipments. */
export async function assertCanCreateShipment(supabase: DB, workspaceId: string): Promise<void> {
  const limit = planLimits(await getWorkspacePlan(supabase, workspaceId)).maxShipments;
  if (limit == null) return;
  const { count } = await supabase
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if ((count ?? 0) >= limit) {
    throw new ActionError(
      `무료 플랜은 수출건 ${limit}개까지입니다. Pro로 업그레이드하면 무제한입니다.`,
      "PLAN_LIMIT",
    );
  }
}

/** Free plan caps monthly validation runs. */
export async function assertCanRunValidation(supabase: DB, workspaceId: string): Promise<void> {
  const limit = planLimits(await getWorkspacePlan(supabase, workspaceId)).validationsPerMonth;
  if (limit == null) return;
  const { count } = await supabase
    .from("validations")
    .select("id", { count: "exact", head: true })
    .gte("run_at", monthStartIso());
  if ((count ?? 0) >= limit) {
    throw new ActionError(
      `무료 플랜은 월 ${limit}회까지 검증할 수 있습니다. Pro는 무제한입니다.`,
      "PLAN_LIMIT",
    );
  }
}
