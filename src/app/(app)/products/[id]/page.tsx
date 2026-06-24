import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { HsCodeNotice } from "@/components/products/hs-code-notice";
import { getProduct } from "@/lib/data/products";
import { deleteProductAction } from "@/lib/actions/products";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "제품 상세" };

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <>
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        제품 목록
      </Link>

      <PageHeader
        title={product.name_en}
        description={product.origin_country ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/products/${product.id}/edit`}>
                <Pencil className="h-4 w-4" />
                수정
              </Link>
            </Button>
            <ConfirmDeleteButton
              id={product.id}
              action={deleteProductAction}
              title="제품을 삭제할까요?"
              description="삭제해도 기존 수출건 품목 기록은 유지됩니다. 목록과 자동완성에서는 더 이상 보이지 않습니다."
              successMessage="제품을 삭제했습니다."
              redirectTo="/products"
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">제품 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="영문 품명" value={product.name_en} />
          <Field
            label="HS코드 (참고용)"
            value={product.hs_code ? <span className="font-mono">{product.hs_code}</span> : null}
          />
          <Field label="원산지" value={product.origin_country} />
          <Field label="단위" value={product.unit} />
          <Field label="단가 (USD)" value={formatMoney(product.unit_price_usd, "USD")} />
          <Field label="규격" value={product.dimensions} />
          <Field label="순중량 (kg)" value={product.net_weight ?? undefined} />
          <Field label="총중량 (kg)" value={product.gross_weight ?? undefined} />
        </CardContent>
      </Card>

      <HsCodeNotice />
    </>
  );
}
