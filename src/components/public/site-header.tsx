import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shared marketing header for public pages (landing, pricing, legal). */
export function SiteHeader({ authed }: { authed: boolean }) {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileCheck2 className="h-4 w-4" />
          </span>
          TradeDocs
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">요금제</Link>
          </Button>
          {authed ? (
            <Button asChild size="sm">
              <Link href="/dashboard">대시보드</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">로그인</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">무료로 시작</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
