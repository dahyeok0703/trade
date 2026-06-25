import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "요금제" };

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileCheck2 className="h-4 w-4" />
            </span>
            TradeDocs
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
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

      <section className="container max-w-3xl flex-1 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">요금제</h1>
          <p className="mt-2 text-muted-foreground">
            소규모 수출자를 위한 합리적인 요금. 필요할 때 Pro로 업그레이드하세요.
          </p>
        </div>

        <PlanComparison
          freeCta={
            <Button asChild variant="outline" className="w-full">
              <Link href={user ? "/dashboard" : "/signup"}>
                {user ? "대시보드로" : "무료로 시작"}
              </Link>
            </Button>
          }
          proCta={
            <Button asChild className="w-full">
              <Link href={user ? "/billing" : "/signup"}>
                {user ? "결제 관리" : "Pro로 시작"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          가격은 부가세 별도이며 변경될 수 있습니다. 결제는 PortOne(포트원)을 통해 안전하게
          처리됩니다.
        </p>
      </section>
    </main>
  );
}
