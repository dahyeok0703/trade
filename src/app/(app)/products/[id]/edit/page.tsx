import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { getProduct } from "@/lib/data/products";

export const metadata: Metadata = { title: "제품 수정" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <>
      <Link
        href={`/products/${product.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {product.name_en}
      </Link>
      <PageHeader title="제품 수정" />
      <ProductForm product={product} />
    </>
  );
}
