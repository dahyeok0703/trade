"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "@/lib/actions/billing";

export function ManageSubscription({ cancelAtPeriodEnd }: { cancelAtPeriodEnd: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error: string | null }>, msg: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(msg);
      router.refresh();
    });
  }

  if (cancelAtPeriodEnd) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => run(() => resumeSubscriptionAction({}), "구독을 재개했습니다.")}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        구독 재개
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          구독 해지
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>구독을 해지할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            현재 결제 기간이 끝날 때까지 Pro 기능을 계속 사용할 수 있으며, 이후 Free로 전환됩니다.
            기간 종료 전에는 언제든 재개할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>닫기</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              run(() => cancelSubscriptionAction({}), "구독을 해지했습니다.");
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            해지
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
