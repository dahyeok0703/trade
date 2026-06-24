import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";

export const metadata: Metadata = { title: "제품 등록" };

export default function NewProductPage() {
  return (
    <>
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        제품 목록
      </Link>
      <PageHeader title="제품 등록" description="서류 출력 기준이 되는 영문 정보를 입력하세요." />
      <ProductForm />
    </>
  );
}
