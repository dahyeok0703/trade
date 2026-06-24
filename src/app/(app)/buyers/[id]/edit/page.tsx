import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BuyerForm } from "@/components/buyers/buyer-form";
import { getBuyer } from "@/lib/data/buyers";

export const metadata: Metadata = { title: "바이어 수정" };

export default async function EditBuyerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buyer = await getBuyer(id);
  if (!buyer) notFound();

  return (
    <>
      <Link
        href={`/buyers/${buyer.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {buyer.name_en}
      </Link>
      <PageHeader title="바이어 수정" />
      <BuyerForm buyer={buyer} />
    </>
  );
}
