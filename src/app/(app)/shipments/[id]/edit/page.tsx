import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ShipmentForm } from "@/components/shipments/shipment-form";
import { getShipment, listBuyerOptions } from "@/lib/data/shipments";

export const metadata: Metadata = { title: "수출건 수정" };

export default async function EditShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [shipment, buyers] = await Promise.all([getShipment(id), listBuyerOptions()]);
  if (!shipment) notFound();

  return (
    <>
      <Link
        href={`/shipments/${shipment.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {shipment.ref_no}
      </Link>
      <PageHeader title="수출건 수정" />
      <ShipmentForm buyers={buyers} shipment={shipment} />
    </>
  );
}
