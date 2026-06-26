import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { ManageSubscription } from "@/components/billing/manage-subscription";
import { getWorkspaceContext } from "@/lib/auth/session";
import { getSubscription, listBillingEvents } from "@/lib/data/billing";
import { features, billingPublic } from "@/lib/env";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "결제" };

const EVENT_LABEL: Record<string, string> = {
  "subscription.created": "구독 시작",
  "subscription.canceled": "구독 해지 예약",
  "subscription.resumed": "구독 재개",
};

export default async function BillingPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) return null;

  if (ctx.member.role !== "owner") {
    return (
      <>
        <PageHeader title="결제" description="구독과 결제수단을 관리합니다." />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            결제 정보는 관리자만 확인·관리할 수 있습니다.
          </CardContent>
        </Card>
      </>
    );
  }

  const [subscription, events] = await Promise.all([
    getSubscription(ctx.workspace.id),
    listBillingEvents(ctx.workspace.id),
  ]);
  const plan = ctx.workspace.plan;
  const isPro = plan === "pro";
  const canSubscribe = features.billing && billingPublic.ready;

  return (
    <>
      <PageHeader title="결제" description="구독과 결제수단을 관리합니다." />

      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">현재 플랜</CardTitle>
            <Badge variant={isPro ? "success" : "secondary"}>{isPro ? "Pro" : "Free"}</Badge>
          </div>
          <CardDescription>
            {isPro
              ? "Pro 플랜 — 무제한 수출건·서류, 넉넉한 AI 추출, 워터마크 없는 PDF."
              : "Free 플랜 — 일부 기능에 한도가 있습니다."}
          </CardDescription>
        </CardHeader>
        {isPro && subscription && (
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">상태</span>
              <span className="font-medium">
                {subscription.cancel_at_period_end ? "기간 종료 시 해지 예정" : "이용 중"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">결제수단</span>
              <span className="flex items-center gap-1.5 font-medium">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {subscription.card_brand ?? "카드"} ····{" "}
                {subscription.card_last4 ?? "----"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {subscription.cancel_at_period_end ? "이용 종료일" : "다음 결제일"}
              </span>
              <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
            </div>
            <div className="flex justify-end pt-1">
              <ManageSubscription cancelAtPeriodEnd={subscription.cancel_at_period_end} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Upgrade (free) */}
      {!isPro && (
        <PlanComparison
          currentPlan={plan}
          proCta={
            <SubscribeButton
              ready={canSubscribe}
              storeId={billingPublic.storeId}
              channelKey={billingPublic.channelKey}
              customerId={ctx.workspace.id}
            />
          }
        />
      )}

      {!features.billing && (
        <p className="text-sm text-muted-foreground">
          ※ 결제 연동이 아직 설정되지 않았습니다(준비중). PortOne 키를 설정하면 활성화됩니다.
        </p>
      )}

      {/* History */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">결제 이력</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span>{EVENT_LABEL[e.type] ?? e.type}</span>
                <span className="text-xs text-muted-foreground">{formatDate(e.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        ※ 결제는 PortOne(포트원)을 통해 처리되며, 금액·일정은 참고치로 공식 회계를 대체하지
        않습니다.
      </p>
    </>
  );
}
