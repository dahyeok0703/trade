import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Package, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getWorkspaceContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "대시보드" };

const stats = [
  { label: "바이어", value: 0, icon: Users, href: "/buyers" },
  { label: "수출건", value: 0, icon: Package, href: "/shipments" },
  { label: "발행 서류", value: 0, icon: FileText, href: "/documents" },
];

export default async function DashboardPage() {
  const ctx = await getWorkspaceContext();
  const workspaceName = ctx?.workspace.name ?? "내 워크스페이스";

  return (
    <>
      <PageHeader
        title="대시보드"
        description={`${workspaceName}의 수출 현황을 한눈에 확인하세요.`}
        action={
          <Button disabled>
            <Plus className="h-4 w-4" />새 수출건
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-teal" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시작하기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>아직 기능 골격 단계입니다. 다음 순서로 데이터를 채워가세요.</p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>바이어를 등록합니다.</li>
            <li>수출건을 생성하고 바이어를 연결합니다.</li>
            <li>인보이스·패킹리스트 등 서류를 발행합니다.</li>
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
