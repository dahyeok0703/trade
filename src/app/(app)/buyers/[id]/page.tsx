import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { getBuyer } from "@/lib/data/buyers";
import { deleteBuyerAction } from "@/lib/actions/buyers";
import type { BuyerContact, NotifyParty } from "@/lib/validations/buyer";

export const metadata: Metadata = { title: "바이어 상세" };

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const buyer = await getBuyer(id);
  if (!buyer) notFound();

  const contact = (buyer.contact ?? {}) as BuyerContact;
  const notify = (buyer.notify_party ?? {}) as NotifyParty;

  return (
    <>
      <Link
        href="/buyers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        바이어 목록
      </Link>

      <PageHeader
        title={buyer.name_en}
        description={buyer.country ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/buyers/${buyer.id}/edit`}>
                <Pencil className="h-4 w-4" />
                수정
              </Link>
            </Button>
            <ConfirmDeleteButton
              id={buyer.id}
              action={deleteBuyerAction}
              title="바이어를 삭제할까요?"
              description="삭제해도 기존 서류 기록은 유지됩니다. 목록에서는 더 이상 보이지 않습니다."
              successMessage="바이어를 삭제했습니다."
              redirectTo="/buyers"
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="영문 상호" value={buyer.name_en} />
            <Field label="국가" value={buyer.country} />
            <Field label="영문 주소" value={buyer.address_en} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">연락처</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="담당자" value={contact.person} />
            <Field label="이메일" value={contact.email} />
            <Field label="전화" value={contact.tel} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">통지처 (Notify Party)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="상호" value={notify.name} />
            <Field label="주소" value={notify.address} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
