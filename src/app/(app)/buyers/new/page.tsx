import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BuyerForm } from "@/components/buyers/buyer-form";

export const metadata: Metadata = { title: "바이어 등록" };

export default function NewBuyerPage() {
  return (
    <>
      <Link
        href="/buyers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        바이어 목록
      </Link>
      <PageHeader title="바이어 등록" description="서류 출력 기준이 되는 영문 정보를 입력하세요." />
      <BuyerForm />
    </>
  );
}
