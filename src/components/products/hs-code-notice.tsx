import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Fixed disclaimer shown wherever an HS code is entered or displayed.
 * The product stores HS codes for REFERENCE ONLY — the tool never confirms or
 * guarantees a classification; that is a licensed customs broker's domain.
 */
export function HsCodeNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      <span>※ HS코드·통관 분류는 관세사 확인이 필요합니다. 본 서비스는 참고용으로만 저장하며 확정·보증하지 않습니다.</span>
    </p>
  );
}
