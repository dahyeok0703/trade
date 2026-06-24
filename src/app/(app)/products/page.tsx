import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ProductsSearch } from "@/components/products/products-search";
import { ProductsExcelToolbar } from "@/components/products/products-excel-toolbar";
import { HsCodeNotice } from "@/components/products/hs-code-notice";
import { listOrigins, listProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "제품" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; origin?: string }>;
}) {
  const { q, origin } = await searchParams;
  const [products, origins] = await Promise.all([listProducts({ q, origin }), listOrigins()]);
  const filtered = Boolean(q || origin);

  return (
    <>
      <PageHeader
        title="제품"
        description="서류 생성의 기반이 되는 제품 마스터입니다."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ProductsExcelToolbar />
            <Button asChild>
              <Link href="/products/new">
                <Plus className="h-4 w-4" />
                제품 등록
              </Link>
            </Button>
          </div>
        }
      />

      <ProductsSearch origins={origins} />

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={filtered ? "검색 결과가 없습니다" : "등록된 제품이 없습니다"}
          description={
            filtered
              ? "다른 검색어나 필터로 시도해 보세요."
              : "제품을 등록하면 수출건 품목 추가 시 자동완성으로 불러올 수 있습니다. 엑셀로 일괄 등록도 가능합니다."
          }
          action={
            !filtered && (
              <Button asChild variant="teal">
                <Link href="/products/new">
                  <Plus className="h-4 w-4" />첫 제품 등록
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>영문 품명</TableHead>
                  <TableHead>HS코드</TableHead>
                  <TableHead className="text-right">단가 (USD)</TableHead>
                  <TableHead className="text-right">순중량</TableHead>
                  <TableHead className="text-right">총중량</TableHead>
                  <TableHead>규격</TableHead>
                  <TableHead>원산지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link href={`/products/${p.id}`} className="hover:underline">
                        {p.name_en}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.hs_code ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(p.unit_price_usd, "")}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.net_weight ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.gross_weight ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.dimensions ?? "—"}</TableCell>
                    <TableCell>{p.origin_country ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <HsCodeNotice />
        </>
      )}
    </>
  );
}
