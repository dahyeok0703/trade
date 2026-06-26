import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { ExporterInfoForm } from "@/components/settings/exporter-info-form";
import type { ExporterInfoInput } from "@/lib/validations/workspace";
import { features } from "@/lib/env";
import { getWorkspaceContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext();

  const rows = [
    { label: "회사", value: ctx?.workspace.name ?? "-" },
    { label: "내 계정", value: ctx?.user.email ?? "-" },
    { label: "역할", value: ctx?.member.role === "owner" ? "관리자" : "직원" },
  ];

  const exporterInfo = (ctx?.workspace.exporter_info ?? {}) as Partial<ExporterInfoInput>;

  return (
    <>
      <PageHeader title="설정" description="회사 정보와 계정 정보를 확인합니다." />

      {ctx?.member.role === "owner" && <ExporterInfoForm initial={exporterInfo} />}

      <Card>
        <CardHeader>
          <CardTitle>회사 정보</CardTitle>
          <CardDescription>현재 회사 계정 정보입니다.</CardDescription>
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

      {/* Shown only once AI extraction is configured (API key present). */}
      {features.aiExtraction && (
        <Card>
          <CardHeader>
            <CardTitle>AI 주문서 추출</CardTitle>
            <CardDescription>
              주문서(PDF·이미지·이메일)에서 품목을 자동으로 추출해 초안을 채웁니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">상태</span>
              <Badge variant="success">사용 가능</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
