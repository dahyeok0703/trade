import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

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
import { BuyersSearch } from "@/components/buyers/buyers-search";
import { listBuyers } from "@/lib/data/buyers";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "바이어" };

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const buyers = await listBuyers(q);

  return (
    <>
      <PageHeader
        title="바이어"
        description="거래하는 해외 바이어를 등록하고 관리합니다."
        action={
          <Button asChild>
            <Link href="/buyers/new">
              <Plus className="h-4 w-4" />
              바이어 추가
            </Link>
          </Button>
        }
      />

      <BuyersSearch />

      {buyers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "검색 결과가 없습니다" : "등록된 바이어가 없습니다"}
          description={
            q
              ? "다른 검색어로 시도해 보세요."
              : "바이어를 등록하면 수출건과 서류에서 바로 선택할 수 있습니다."
          }
          action={
            !q && (
              <Button asChild variant="teal">
                <Link href="/buyers/new">
                  <Plus className="h-4 w-4" />첫 바이어 등록
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>영문 상호</TableHead>
                <TableHead>국가</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="text-right">등록일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buyers.map((b) => {
                const contact = (b.contact ?? {}) as Record<string, string>;
                return (
                  <TableRow key={b.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/buyers/${b.id}`} className="hover:underline">
                        {b.name_en}
                      </Link>
                    </TableCell>
                    <TableCell>{b.country ?? "—"}</TableCell>
                    <TableCell>{contact.person ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.email ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(b.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
