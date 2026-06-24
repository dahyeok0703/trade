import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { ExporterInfoForm } from "@/components/settings/exporter-info-form";
import type { ExporterInfoInput } from "@/lib/validations/workspace";
import { features } from "@/lib/env";
import { getWorkspaceContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_EXTRACT_QUOTA } from "@/lib/pricing/cogs";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext();

  // AI usage this month — owner-only (RLS returns nothing for staff).
  let usage: { input_tokens: number; output_tokens: number; doc_count: number; est_cost_krw: number } | null =
    null;
  if (ctx?.member.role === "owner") {
    const supabase = await createClient();
    const monthStart = new Date();
    const monthKey = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("ai_usage")
      .select("input_tokens, output_tokens, doc_count, est_cost_krw")
      .eq("workspace_id", ctx.workspace.id)
      .eq("month", monthKey)
      .maybeSingle();
    usage = data;
  }
  const isFree = (ctx?.workspace.plan ?? "free") === "free";

  const rows = [
    { label: "워크스페이스", value: ctx?.workspace.name ?? "-" },
    { label: "슬러그", value: ctx?.workspace.slug ?? "-" },
    { label: "내 계정", value: ctx?.user.email ?? "-" },
    { label: "역할", value: ctx?.member.role === "owner" ? "관리자(owner)" : "직원(staff)" },
  ];

  const exporterInfo = (ctx?.workspace.exporter_info ?? {}) as Partial<ExporterInfoInput>;

  return (
    <>
      <PageHeader title="설정" description="워크스페이스와 계정 정보를 확인합니다." />

      {ctx?.member.role === "owner" && <ExporterInfoForm initial={exporterInfo} />}

      <Card>
        <CardHeader>
          <CardTitle>워크스페이스</CardTitle>
          <CardDescription>현재 워크스페이스 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row, i) => (
            <div key={row.label}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="truncate font-medium">{row.value}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기능 상태</CardTitle>
          <CardDescription>키가 없는 통합 기능은 자동으로 비활성화됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">AI 항목 추출</p>
              <p className="text-muted-foreground">주문서에서 품목을 추출하는 보조 기능</p>
            </div>
            <Badge variant={features.aiExtraction ? "success" : "secondary"}>
              {features.aiExtraction ? "사용 가능" : "비활성"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {ctx?.member.role === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle>AI 사용량 (이번 달)</CardTitle>
            <CardDescription>
              마진 보호를 위해 추출 호출의 토큰·추정 원가를 집계합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">추출 횟수</span>
              <span className="font-medium tabular-nums">
                {usage?.doc_count ?? 0}
                {isFree ? ` / ${FREE_MONTHLY_EXTRACT_QUOTA}건 (무료 한도)` : "건"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">입력 / 출력 토큰</span>
              <span className="font-medium tabular-nums">
                {(usage?.input_tokens ?? 0).toLocaleString()} /{" "}
                {(usage?.output_tokens ?? 0).toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">추정 원가</span>
              <span className="font-medium tabular-nums">
                {formatMoney(usage?.est_cost_krw ?? 0, "KRW")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
