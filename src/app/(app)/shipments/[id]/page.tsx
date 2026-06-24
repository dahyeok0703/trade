import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  ClipboardCheck,
  FileText,
  Package,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ShipmentStatusSelect } from "@/components/shipments/shipment-status-select";
import { getShipment } from "@/lib/data/shipments";
import { deleteShipmentAction } from "@/lib/actions/shipments";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "수출건 상세" };

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipment(id);
  if (!shipment) notFound();

  return (
    <>
      <Link
        href="/shipments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        수출건 목록
      </Link>

      <PageHeader
        title={shipment.ref_no}
        description={shipment.buyer?.name_en ?? "바이어 미지정"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ShipmentStatusSelect id={shipment.id} status={shipment.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/shipments/${shipment.id}/edit`}>
                <Pencil className="h-4 w-4" />
                수정
              </Link>
            </Button>
            <ConfirmDeleteButton
              id={shipment.id}
              action={deleteShipmentAction}
              title="수출건을 삭제할까요?"
              description="삭제해도 발행된 서류 기록은 유지됩니다. 목록에서는 더 이상 보이지 않습니다."
              successMessage="수출건을 삭제했습니다."
              redirectTo="/shipments"
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Ref No" value={shipment.ref_no} />
          <Field
            label="바이어"
            value={
              shipment.buyer ? (
                <Link href={`/buyers/${shipment.buyer.id}`} className="text-primary hover:underline">
                  {shipment.buyer.name_en}
                </Link>
              ) : null
            }
          />
          <Field label="인코텀즈" value={shipment.incoterms} />
          <Field label="통화" value={shipment.currency} />
          <Field label="선적항 (POL)" value={shipment.port_of_loading} />
          <Field label="도착항 (POD)" value={shipment.port_of_discharge} />
          <Field label="ETD" value={formatDate(shipment.etd)} />
          <Field label="L/C 번호" value={shipment.lc_no} />
          <Field label="등록일" value={formatDate(shipment.created_at)} />
          {shipment.memo && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="메모" value={<span className="whitespace-pre-wrap">{shipment.memo}</span>} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="items">
        <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="items">
            <Package className="h-4 w-4" />
            품목
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4" />
            서류
          </TabsTrigger>
          <TabsTrigger value="validation">
            <ClipboardCheck className="h-4 w-4" />
            일치검증
          </TabsTrigger>
          <TabsTrigger value="payments">
            <BadgeDollarSign className="h-4 w-4" />
            대금
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <EmptyState
            icon={Package}
            title="품목"
            description="이 수출건의 품목(인보이스 라인)을 추가하는 화면이 다음 단계에서 연결됩니다."
          />
        </TabsContent>
        <TabsContent value="documents">
          <EmptyState
            icon={FileText}
            title="서류"
            description="Commercial Invoice·Packing List 등 표준 영문 서류 발행이 다음 단계에서 연결됩니다."
          />
        </TabsContent>
        <TabsContent value="validation">
          <EmptyState
            icon={ClipboardCheck}
            title="일치검증"
            description="인보이스 ↔ 패킹리스트 수량·금액 일치를 규칙 기반으로 점검하는 결과가 여기에 표시됩니다."
          />
        </TabsContent>
        <TabsContent value="payments">
          <EmptyState
            icon={BadgeDollarSign}
            title="대금"
            description="TT·L/C 대금 조건과 입금 상태 추적이 다음 단계에서 연결됩니다."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
