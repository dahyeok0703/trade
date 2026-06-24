import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Package,
  Pencil,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ShipmentStatusSelect } from "@/components/shipments/shipment-status-select";
import { ShipmentItemsManager } from "@/components/shipments/items/shipment-items-manager";
import { getShipment, getShipmentItems } from "@/lib/data/shipments";
import { listProductOptions } from "@/lib/data/products";
import { deleteShipmentAction } from "@/lib/actions/shipments";
import { computeTotals } from "@/lib/documents";
import { formatDate, formatMoney } from "@/lib/utils";

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
  const [shipment, items, products] = await Promise.all([
    getShipment(id),
    getShipmentItems(id),
    listProductOptions(),
  ]);
  if (!shipment) notFound();

  const totals = computeTotals(items);
  const hasItems = items.length > 0;

  // Rule-based consistency checks (deterministic — no AI judgement).
  const grossLtNet = items.filter(
    (it) => it.gross_weight != null && it.net_weight != null && it.gross_weight < it.net_weight,
  );
  const missingPacking = items.filter(
    (it) => it.net_weight == null || it.gross_weight == null || it.ctns == null,
  );

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
          <CardTitle className="text-base">기본 정보 (서류 공통 헤더)</CardTitle>
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
          <Field label="결제조건" value={shipment.payment_terms} />
          <Field label="선적항 (POL)" value={shipment.port_of_loading} />
          <Field label="도착항 (POD)" value={shipment.port_of_discharge} />
          <Field label="ETD" value={formatDate(shipment.etd)} />
          <Field label="L/C 번호" value={shipment.lc_no} />
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
            {hasItems && <span className="ml-1 text-xs text-muted-foreground">{items.length}</span>}
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

        {/* 품목 — single source of truth for both documents */}
        <TabsContent value="items">
          <ShipmentItemsManager
            shipmentId={shipment.id}
            items={items}
            products={products}
            currency={shipment.currency}
          />
        </TabsContent>

        {/* 서류 — both generated from the same items */}
        <TabsContent value="documents">
          {!hasItems ? (
            <EmptyState
              icon={FileText}
              title="먼저 품목을 추가하세요"
              description="품목을 입력하면 동일한 데이터로 인보이스와 패킹리스트가 함께 생성됩니다."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                같은 품목 데이터({items.length}건)에서 생성되어 두 서류가 구조적으로 일치합니다.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href={`/shipments/${shipment.id}/invoice`} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-teal" />
                        Commercial Invoice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      금액 중심 · 총액 {formatMoney(totals.amount, shipment.currency)}
                    </CardContent>
                  </Card>
                </Link>
                <Link href={`/shipments/${shipment.id}/packing-list`} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/40">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-teal" />
                        Packing List
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      수량·중량·용적 중심 · {totals.ctns.toLocaleString()} CTNS ·{" "}
                      {totals.cbm.toLocaleString()} CBM
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 일치검증 — deterministic, rule-based */}
        <TabsContent value="validation">
          {!hasItems ? (
            <EmptyState
              icon={ClipboardCheck}
              title="검증할 품목이 없습니다"
              description="품목을 추가하면 규칙 기반 일치검증 결과가 표시됩니다."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">규칙 기반 일치검증</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p>
                    인보이스와 패킹리스트는 <strong>동일한 품목 데이터</strong>에서 생성됩니다 —
                    품명·HS코드·수량이 구조적으로 일치합니다.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p>모든 라인의 금액 = 수량 × 단가로 자동 계산됩니다 (서버 검증).</p>
                </div>
                {grossLtNet.length > 0 ? (
                  <div className="flex items-start gap-2 text-destructive">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      총중량 &lt; 순중량인 품목 {grossLtNet.length}건: {""}
                      {grossLtNet.map((i) => i.description_en).join(", ")}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <p>모든 품목에서 총중량 ≥ 순중량입니다.</p>
                  </div>
                )}
                {missingPacking.length > 0 && (
                  <div className="flex items-start gap-2 text-warning">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      패킹리스트 정보(순중량·총중량·박스수)가 일부 비어 있는 품목 {""}
                      {missingPacking.length}건이 있습니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <EmptyState
            icon={BadgeDollarSign}
            title="대금"
            description={`결제조건: ${shipment.payment_terms ?? "미입력"} · TT·L/C 입금 추적이 다음 단계에서 연결됩니다.`}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
