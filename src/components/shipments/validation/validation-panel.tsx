"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { runValidationAction, markDocumentsReadyAction } from "@/lib/actions/validations";
import type { CheckResult, ValidationReport } from "@/lib/validation/rules";
import type { ShipmentStatus } from "@/lib/supabase/database.types";

function CheckRow({ check }: { check: CheckResult }) {
  const failed = !check.passed;
  const isError = failed && check.severity === "error";
  const isWarn = failed && check.severity === "warning";

  return (
    <div className="flex items-start gap-3 border-b py-2.5 last:border-0">
      {check.passed ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : isError ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            isError && "font-medium text-destructive",
            isWarn && "text-warning",
          )}
        >
          {check.label}
          {failed && (
            <span className="ml-2 text-xs">{isError ? "불일치" : "확인 권장"}</span>
          )}
        </p>
        {failed && check.detail && (
          <p className="mt-0.5 text-xs text-muted-foreground">→ {check.detail}</p>
        )}
      </div>
    </div>
  );
}

export function ValidationPanel({
  shipmentId,
  status,
  initialReport,
  initialRunAt,
}: {
  shipmentId: string;
  status: ShipmentStatus;
  initialReport: ValidationReport | null;
  initialRunAt: string | null;
}) {
  const router = useRouter();
  const [report, setReport] = useState<ValidationReport | null>(initialReport);
  const [runAt, setRunAt] = useState<string | null>(initialRunAt);
  const [forceOpen, setForceOpen] = useState(false);
  const [isRunning, startRun] = useTransition();
  const [isAdvancing, startAdvance] = useTransition();

  const alreadyReady = status !== "draft";

  function runCheck() {
    startRun(async () => {
      const result = await runValidationAction({ id: shipmentId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReport(result.data.report);
      setRunAt(new Date().toISOString());
    });
  }

  function advance(force: boolean) {
    startAdvance(async () => {
      const result = await markDocumentsReadyAction({ id: shipmentId, force });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReport(result.data.report);
      setRunAt(new Date().toISOString());
      if (result.data.outcome === "blocked") {
        setForceOpen(true);
        return;
      }
      setForceOpen(false);
      toast.success(
        force ? "경고를 무시하고 '서류 준비 완료'로 전환했습니다." : "'서류 준비 완료'로 전환했습니다.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          서류 보내기 전, 인보이스 ↔ 패킹리스트 숫자와 필수 항목을 규칙 기반으로 점검합니다.
          {runAt && (
            <span className="ml-1 text-xs">
              (최근 검증: {new Date(runAt).toLocaleString("ko-KR")})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={runCheck} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            검증 실행
          </Button>
          {!alreadyReady && (
            <Button size="sm" variant="teal" onClick={() => advance(false)} disabled={isAdvancing}>
              {isAdvancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              서류 준비 완료로 전환
            </Button>
          )}
        </div>
      </div>

      {/* Summary banner */}
      {report && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-4",
            report.passed
              ? "border-success/30 bg-success/10"
              : "border-destructive/30 bg-destructive/10",
          )}
        >
          {report.passed ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
          ) : (
            <XCircle className="h-6 w-6 shrink-0 text-destructive" />
          )}
          <div>
            <p className="font-semibold">
              {report.passed ? "검증 통과" : `불일치 ${report.summary.errors}건`}
            </p>
            <p className="text-sm text-muted-foreground">
              {report.summary.passedCount}/{report.summary.total} 통과
              {report.summary.warnings > 0 && ` · 확인 권장 ${report.summary.warnings}건`}
              {report.passed && " · 서류를 안전하게 발행할 수 있습니다."}
            </p>
          </div>
        </div>
      )}

      {/* Check list */}
      {report ? (
        <Card>
          <CardContent className="py-2">
            {report.checks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            아직 검증을 실행하지 않았습니다. <strong>검증 실행</strong>을 눌러 점검하세요.
          </CardContent>
        </Card>
      )}

      {alreadyReady && (
        <p className="text-xs text-muted-foreground">
          이미 서류 준비 완료 이후 단계입니다. 상태는 상단에서 변경할 수 있습니다.
        </p>
      )}

      {/* Force-advance confirmation */}
      <AlertDialog open={forceOpen} onOpenChange={setForceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>불일치 항목이 있습니다</AlertDialogTitle>
            <AlertDialogDescription>
              {report ? `${report.summary.errors}건의 불일치가 있습니다. ` : ""}
              그대로 「서류 준비 완료」로 진행하면 통관 지연 위험이 있습니다. 강제로 진행할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAdvancing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                advance(true);
              }}
              disabled={isAdvancing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAdvancing && <Loader2 className="h-4 w-4 animate-spin" />}
              강제로 진행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
