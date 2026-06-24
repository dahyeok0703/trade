import Link from "next/link";
import { FileCheck2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <FileCheck2 className="h-4 w-4" />
          </span>
          TradeDocs
        </Link>
        <div className="space-y-4">
          <p className="text-2xl font-semibold leading-snug">
            수출 서류, 더 빠르고 정확하게.
          </p>
          <p className="max-w-sm text-sm text-primary-foreground/70">
            인보이스·패킹리스트를 표준 영문 양식으로 일관되게 발행하고, 바이어와 수출건을 한
            곳에서 관리하세요.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          HS코드·통관 관련 사항은 관세사와 상담하세요.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
