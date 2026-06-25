import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  Package,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { ByBuyerChart, ByMonthChart } from "@/components/dashboard/charts";
import { getDashboardData, type Money } from "@/lib/data/dashboard";
import { getWorkspaceContext } from "@/lib/auth/session";
import { SHIPMENT_STATUS } from "@/lib/constants/trade";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "대시보드" };

function MoneyLines({ list, danger }: { list: Money[]; danger?: boolean }) {
  if (list.length === 0) return <p className="text-2xl font-semibold tabular-nums">—</p>;
  return (
    <div className={danger ? "text-destructive" : undefined}>
      {list.map((m, i) => (
        <p
          key={m.currency}
          className={i === 0 ? "text-2xl font-semibold tabular-nums" : "text-sm tabular-nums"}
        >
          {formatMoney(m.amount, m.currency)}
        </p>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Package;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-teal" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [ctx, data] = await Promise.all([getWorkspaceContext(), getDashboardData()]);
  const workspaceName = ctx?.workspace.name ?? "내 워크스페이스";

  return (
    <>
      <PageHeader
        title="대시보드"
        description={`${workspaceName}의 수출 현황`}
        action={
          <Button asChild>
            <Link href="/shipments/new">
              <Plus className="h-4 w-4" />새 수출건
            </Link>
          </Button>
        }
      />

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Package} label="진행 중 수출건">
          <p className="text-3xl font-semibold tabular-nums">{data.active}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {data.byStatus
              .filter((s) => s.count > 0)
              .map((s) => (
                <Badge key={s.status} variant={SHIPMENT_STATUS[s.status].badge}>
                  {SHIPMENT_STATUS[s.status].label} {s.count}
                </Badge>
              ))}
          </div>
        </StatCard>
        <StatCard icon={CalendarClock} label="이번 달 ETD">
          <p className="text-3xl font-semibold tabular-nums">{data.thisMonthEtd}</p>
          <p className="mt-1 text-xs text-muted-foreground">출항 예정 건수</p>
        </StatCard>
        <StatCard icon={BadgeDollarSign} label="받을 대금 (미입금)">
          <MoneyLines list={data.receivable} />
        </StatCard>
        <StatCard icon={AlertTriangle} label="연체">
          <MoneyLines list={data.overdue} danger />
          <p className="mt-1 text-xs text-muted-foreground">{data.overdueCount}건</p>
        </StatCard>
      </div>

      {/* Lists: upcoming ETD + warnings */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-teal" />
              선적 임박 (ETD 30일 이내)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">예정된 선적이 없습니다.</p>
            ) : (
              <div className="divide-y">
                {data.upcoming.map((s) => (
                  <Link
                    key={s.id}
                    href={`/shipments/${s.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{s.ref_no}</span>
                      <span className="ml-2 text-muted-foreground">{s.buyer ?? "바이어 미지정"}</span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <ShipmentStatusBadge status={s.status} />
                      <span className="text-xs text-muted-foreground">{formatDate(s.etd)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={data.warnings.length > 0 ? "border-destructive/30" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={`h-4 w-4 ${data.warnings.length ? "text-destructive" : "text-teal"}`} />
              서류 점검 필요
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.warnings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                점검이 필요한 건이 없습니다.
              </p>
            ) : (
              <div className="divide-y">
                {data.warnings.map((w) => (
                  <Link
                    key={w.id}
                    href={`/shipments/${w.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-accent/40"
                  >
                    <span className="font-medium">{w.ref_no}</span>
                    <Badge variant={w.reason === "검증 불일치" ? "destructive" : "warning"}>
                      {w.reason}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-teal" />
              바이어별 수출 금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ByBuyerChart data={data.byBuyer} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-teal" />
              월별 수출 금액 (ETD 기준)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ByMonthChart data={data.byMonth} />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        ※ 금액·일정은 입력값 기반 참고치이며 공식 통관·회계를 대체하지 않습니다. 통화가 다른
        금액은 단순 합산될 수 있습니다.
      </p>
    </>
  );
}
