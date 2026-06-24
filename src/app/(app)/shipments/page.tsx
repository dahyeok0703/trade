import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Package, Plus, Ship, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusFilter } from "@/components/shipments/status-filter";
import { ShipmentStatusBadge } from "@/components/shipments/shipment-status-badge";
import { listShipments } from "@/lib/data/shipments";
import { SHIPMENT_STATUS } from "@/lib/constants/trade";
import { formatDate } from "@/lib/utils";
import type { ShipmentStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "수출건" };

function parseStatus(value?: string): ShipmentStatus | undefined {
  return value && value in SHIPMENT_STATUS ? (value as ShipmentStatus) : undefined;
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = parseStatus(status);
  const shipments = await listShipments(active);

  return (
    <>
      <PageHeader
        title="수출건"
        description="개별 수출 거래(선적)를 관리하고 서류를 묶어 발행합니다."
        action={
          <Button asChild>
            <Link href="/shipments/new">
              <Plus className="h-4 w-4" />
              수출건 생성
            </Link>
          </Button>
        }
      />

      <StatusFilter active={active} />

      {shipments.length === 0 ? (
        <EmptyState
          icon={Package}
          title={active ? "해당 상태의 수출건이 없습니다" : "등록된 수출건이 없습니다"}
          description={
            active
              ? "다른 상태를 선택해 보세요."
              : "수출건을 생성하고 바이어를 연결하면 품목·서류·대금을 함께 관리할 수 있습니다."
          }
          action={
            !active && (
              <Button asChild variant="teal">
                <Link href="/shipments/new">
                  <Plus className="h-4 w-4" />첫 수출건 생성
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shipments.map((s) => (
            <Link key={s.id} href={`/shipments/${s.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{s.ref_no}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {s.buyer?.name_en ?? "바이어 미지정"}
                    </p>
                  </div>
                  <ShipmentStatusBadge status={s.status} />
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-teal" />
                    <span>{s.incoterms ?? "인코텀즈 미정"}</span>
                    <span className="text-border">·</span>
                    <span>{s.currency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-teal" />
                    <span>ETD {formatDate(s.etd)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
