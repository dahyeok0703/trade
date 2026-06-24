"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, FileCheck2, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { issueDocumentAction } from "@/lib/actions/documents";
import { formatDate, formatMoney } from "@/lib/utils";
import type { IssuedDocument } from "@/lib/data/documents";
import type { TradeDocType } from "@/lib/supabase/database.types";

type Slug = "invoice" | "packing-list" | "certificate-of-origin";

const DOC_LABEL: Record<TradeDocType, string> = {
  commercial_invoice: "Commercial Invoice",
  packing_list: "Packing List",
  certificate_of_origin: "Certificate of Origin",
  other: "기타",
};

const TYPE_TO_SLUG: Partial<Record<TradeDocType, Slug>> = {
  commercial_invoice: "invoice",
  packing_list: "packing-list",
  certificate_of_origin: "certificate-of-origin",
};

export function DocumentsPanel({
  shipmentId,
  currency,
  totalAmount,
  totalCtns,
  totalCbm,
  issued,
}: {
  shipmentId: string;
  currency: string;
  totalAmount: number;
  totalCtns: number;
  totalCbm: number;
  issued: IssuedDocument[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Slug | null>(null);
  const [, startTransition] = useTransition();

  const cards: { slug: Slug; label: string; desc: string; template?: boolean }[] = [
    { slug: "invoice", label: "Commercial Invoice", desc: `금액 중심 · 총액 ${formatMoney(totalAmount, currency)}` },
    {
      slug: "packing-list",
      label: "Packing List",
      desc: `수량·중량·용적 · ${totalCtns.toLocaleString()} CTNS · ${totalCbm.toLocaleString()} CBM`,
    },
    { slug: "certificate-of-origin", label: "Certificate of Origin", desc: "원산지 (참고 양식)", template: true },
  ];

  function issue(slug: Slug) {
    setPending(slug);
    startTransition(async () => {
      const result = await issueDocumentAction({ shipmentId, slug });
      setPending(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.docNo} 발행 이력을 저장했습니다.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        같은 품목 데이터에서 표준 영문 PDF를 생성합니다. 미리보기로 확인 후 다운로드하고, 발행
        시 이력이 기록됩니다.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.slug} className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-teal" />
                {c.label}
              </CardTitle>
              {c.template && <Badge variant="secondary">참고</Badge>}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-3">
              <p className="text-sm text-muted-foreground">{c.desc}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/documents/${shipmentId}/${c.slug}`} target="_blank" rel="noreferrer">
                    <Eye className="h-4 w-4" />
                    미리보기
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/documents/${shipmentId}/${c.slug}?dl=1`}>
                    <Download className="h-4 w-4" />
                    PDF
                  </a>
                </Button>
                <Button size="sm" variant="teal" onClick={() => issue(c.slug)} disabled={pending !== null}>
                  {pending === c.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck2 className="h-4 w-4" />
                  )}
                  발행
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {issued.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">발행 이력</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {issued.map((d) => {
              const slug = TYPE_TO_SLUG[d.doc_type];
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium">{d.doc_no ?? "-"}</span>
                    <span className="ml-2 text-muted-foreground">{DOC_LABEL[d.doc_type]}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(d.issued_on ?? d.created_at)}
                    </span>
                    {slug && (
                      <Button asChild variant="ghost" size="sm" className="h-7">
                        <a href={`/api/documents/${shipmentId}/${slug}?dl=1`}>
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        ※ 서류 양식은 일반적 무역 표준을 따르며, 최종 사용 책임은 수출자에게 있습니다. HS코드·통관
        분류는 관세사 확인이 필요합니다.
      </p>
    </div>
  );
}
