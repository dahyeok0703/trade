import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/session";
import { createAnthropic } from "@/lib/ai/client";
import { prepareInput, runExtraction, ExtractionError } from "@/lib/ai/extract";
import { matchExtraction } from "@/lib/ai/match";
import { listProductOptions } from "@/lib/data/products";
import { estimateCostKrw } from "@/lib/pricing/cogs";
import { planLimits } from "@/lib/billing/plans";
import type { WorkspacePlan } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

function fail(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

export async function POST(req: NextRequest) {
  // ── Auth (workspace-scoped) ────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "로그인이 필요합니다.", "UNAUTHENTICATED");

  const member = await getActiveMembership(user.id);
  if (!member) return fail(403, "워크스페이스 접근 권한이 없습니다.", "NO_WORKSPACE");

  // ── Feature gate (graceful when no key) ────────────────────────────────────
  const client = createAnthropic();
  if (!client) {
    return fail(503, "AI 추출이 비활성화되어 있습니다. 수동으로 입력해 주세요.", "AI_DISABLED");
  }

  // ── Quota (free plan) ──────────────────────────────────────────────────────
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", member.workspace_id)
    .maybeSingle();
  const plan = (workspace?.plan ?? "free") as WorkspacePlan;
  const aiQuota = planLimits(plan).aiExtractionsPerMonth;

  const { data: used } = await supabase.rpc("ai_extract_count_this_month");
  if ((used ?? 0) >= aiQuota) {
    return fail(
      429,
      plan === "free"
        ? `무료 플랜 월 추출 한도(${aiQuota}회)를 초과했습니다. 수동 입력을 사용하거나 Pro로 업그레이드해 주세요.`
        : `이번 달 추출 한도(${aiQuota}회)를 초과했습니다.`,
      "QUOTA_EXCEEDED",
    );
  }

  // ── Read input (file or pasted text) ───────────────────────────────────────
  let prepared;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { text?: string };
      prepared = await prepareInput({ text: body.text });
    } else {
      const form = await req.formData();
      const file = form.get("file");
      const text = form.get("text");
      if (file instanceof File) {
        if (file.size > MAX_FILE_BYTES) {
          return fail(413, "파일이 너무 큽니다. (최대 8MB)", "FILE_TOO_LARGE");
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        prepared = await prepareInput({ file: { buffer, mimeType: file.type } });
      } else if (typeof text === "string") {
        prepared = await prepareInput({ text });
      } else {
        return fail(400, "추출할 파일 또는 텍스트가 필요합니다.", "NO_INPUT");
      }
    }
  } catch (err) {
    if (err instanceof ExtractionError) return fail(400, err.message, err.code);
    return fail(400, "입력을 읽지 못했습니다.", "BAD_INPUT");
  }

  // ── Extract (Haiku → Sonnet fallback) ──────────────────────────────────────
  try {
    const run = await runExtraction(client, prepared.content);

    // Record token usage for margin tracking (best-effort).
    const estCostKrw = estimateCostKrw(run.model, run.usage);
    const { error: usageError } = await supabase.rpc("record_ai_usage", {
      p_input_tokens: run.usage.inputTokens + (run.usage.cacheReadInputTokens ?? 0),
      p_output_tokens: run.usage.outputTokens,
      p_doc_count: 1,
      p_est_cost_krw: estCostKrw,
    });
    if (usageError) console.error("[extract] failed to record ai_usage", usageError);

    // Deterministic enrichment against the product master.
    const products = await listProductOptions();
    const items = matchExtraction(run.result, products);

    return NextResponse.json({
      ok: true,
      items,
      model: run.model,
      sourceKind: prepared.sourceKind,
      lowConfidence: run.lowConfidence,
      notes: run.result.notes,
      usage: {
        inputTokens: run.usage.inputTokens,
        outputTokens: run.usage.outputTokens,
        estCostKrw,
      },
    });
  } catch (err) {
    if (err instanceof ExtractionError) return fail(422, err.message, err.code);
    console.error("[extract] unexpected error", err);
    return fail(500, "추출 처리 중 오류가 발생했습니다.", "INTERNAL");
  }
}
