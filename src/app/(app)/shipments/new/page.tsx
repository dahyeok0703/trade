import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ShipmentForm } from "@/components/shipments/shipment-form";
import { listBuyerOptions } from "@/lib/data/shipments";

export const metadata: Metadata = { title: "수출건 생성" };

export default async function NewShipmentPage() {
  const buyers = await listBuyerOptions();

  return (
    <>
      <Link
        href="/shipments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        수출건 목록
      </Link>
      <PageHeader title="수출건 생성" description="바이어와 선적 조건을 입력하세요." />
      <ShipmentForm buyers={buyers} />
    </>
  );
}
