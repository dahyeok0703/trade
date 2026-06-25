"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { subscribeAction } from "@/lib/actions/billing";

export function SubscribeButton({
  ready,
  storeId,
  channelKey,
  customerId,
  label = "Pro 구독하기",
}: {
  ready: boolean;
  storeId?: string;
  channelKey?: string;
  customerId: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!ready || !storeId || !channelKey) {
    return (
      <Button className="w-full" disabled>
        결제 준비중
      </Button>
    );
  }

  async function subscribe() {
    setLoading(true);
    try {
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestIssueBillingKey({
        storeId: storeId!,
        channelKey: channelKey!,
        billingKeyMethod: "CARD",
        issueId: crypto.randomUUID(),
        issueName: "TradeDocs Pro",
        customer: { customerId },
      });

      if (!response || response.code) {
        toast.error(response?.message ?? "빌링키 발급이 취소되었습니다.");
        return;
      }

      const result = await subscribeAction({ billingKey: response.billingKey });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pro 구독을 시작했습니다.");
      router.refresh();
    } catch {
      toast.error("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" onClick={subscribe} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
      {label}
    </Button>
  );
}
