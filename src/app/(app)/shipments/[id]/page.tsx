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
import { ShipmentItemsManager } from "@/components/shipments/items/shipment-items-manager";
import { ValidationPanel } from "@/components/shipments/validation/validation-panel";
import { DocumentsPanel } from "@/components/shipments/documents/documents-panel";
import { PaymentsPanel } from "@/components/shipments/payments/payments-panel";
import { getShipment, getShipmentItems } from "@/lib/data/shipments";
import { getLatestValidation } from "@/lib/data/validations";
import { listIssuedDocuments } from "@/lib/data/documents";
import { getPayments } from "@/lib/data/payments";
import { listProductOptions } from "@/lib/data/products";
import { deleteShipmentAction } from "@/lib/actions/shipments";
import { computeTotals } from "@/lib/documents";
import { features } from "@/lib/env";
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
  const [shipment, items, products, latestValidation, issuedDocs, payments] = await Promise.all([
    getShipment(id),
    getShipmentItems(id),
    listProductOptions(),
    getLatestValidation(id),
    listIssuedDocuments(id),
    getPayments(id),
  ]);
  if (!shipment) notFound();

  const totals = computeTotals(items);
  const hasItems = items.length > 0;

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
          <Field label="ETD (출항)" value={formatDate(shipment.etd)} />
          <Field label="ETA (도착)" value={formatDate(shipment.eta)} />
          <Field label="L/C 번호" value={shipment.lc_no} />
          <Field label="B/L 번호" value={shipment.bl_no} />
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
            buyerId={shipment.buyer_id}
            items={items}
            products={products}
            currency={shipment.currency}
            aiEnabled={features.aiExtraction}
          />
        </TabsContent>

        {/* 서류 — standard English PDFs from the same items */}
        <TabsContent value="documents">
          {!hasItems ? (
            <EmptyState
              icon={FileText}
              title="먼저 품목을 추가하세요"
              description="품목을 입력하면 동일한 데이터로 인보이스·패킹리스트 PDF가 생성됩니다."
            />
          ) : (
            <DocumentsPanel
              shipmentId={shipment.id}
              currency={shipment.currency}
              totalAmount={totals.amount}
              totalCtns={totals.ctns}
              totalCbm={totals.cbm}
              issued={issuedDocs}
            />
          )}
        </TabsContent>

        {/* 일치검증 — deterministic, rule-based */}
        <TabsContent value="validation">
          {!hasItems ? (
            <EmptyState
              icon={ClipboardCheck}
              title="검증할 품목이 없습니다"
              description="품목을 추가하면 규칙 기반 일치검증을 실행할 수 있습니다."
            />
          ) : (
            <ValidationPanel
              shipmentId={shipment.id}
              status={shipment.status}
              initialReport={latestValidation?.result ?? null}
              initialRunAt={latestValidation?.run_at ?? null}
            />
          )}
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsPanel
            shipmentId={shipment.id}
            currency={shipment.currency}
            payments={payments}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
