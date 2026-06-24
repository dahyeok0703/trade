import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";

import { PrintButton } from "@/components/print-button";
import { PackingListDocument } from "@/components/documents/packing-list-document";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { getShipment, getShipmentItems } from "@/lib/data/shipments";
import { getWorkspaceContext } from "@/lib/auth/session";
import { buildDocumentModel } from "@/lib/documents";

export const metadata: Metadata = { title: "Packing List" };

export default async function PackingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ctx, shipment, items] = await Promise.all([
    getWorkspaceContext(),
    getShipment(id),
    getShipmentItems(id),
  ]);
  if (!ctx || !shipment) notFound();

  return (
    <>
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/shipments/${shipment.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {shipment.ref_no}
        </Link>
        {items.length > 0 && <PrintButton />}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="품목이 없습니다"
          description="패킹리스트를 생성하려면 먼저 수출건에 품목을 추가하세요."
          action={
            <Button asChild variant="teal">
              <Link href={`/shipments/${shipment.id}`}>품목 추가하러 가기</Link>
            </Button>
          }
        />
      ) : (
        <PackingListDocument
          model={buildDocumentModel(ctx.workspace, shipment, shipment.buyer, items)}
          docNo={`PL-${shipment.ref_no}`}
        />
      )}
    </>
  );
}
