"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">문제가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground">
          요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">오류 코드: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
