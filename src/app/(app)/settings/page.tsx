import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { features } from "@/lib/env";
import { getWorkspaceContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext();

  const rows = [
    { label: "워크스페이스", value: ctx?.workspace.name ?? "-" },
    { label: "슬러그", value: ctx?.workspace.slug ?? "-" },
    { label: "내 계정", value: ctx?.user.email ?? "-" },
    { label: "역할", value: ctx?.member.role === "owner" ? "관리자(owner)" : "직원(staff)" },
  ];

  return (
    <>
      <PageHeader title="설정" description="워크스페이스와 계정 정보를 확인합니다." />

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
    </>
  );
}
