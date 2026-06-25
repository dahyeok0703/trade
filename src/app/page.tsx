import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileStack, ScanLine, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  description:
    "주문서 하나로 인보이스·패킹리스트를 한 번에. 서류 간 숫자 불일치는 규칙 기반으로 자동 점검하는 소규모 수출자용 서류 자동화 도구.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: FileStack,
    title: "서류 세트 자동 생성",
    desc: "수출건 품목을 한 번 입력하면 같은 데이터로 인보이스와 패킹리스트가 동시에 만들어집니다. 두 서류가 한 소스에서 나오니 어긋날 일이 없습니다.",
  },
  {
    icon: ShieldCheck,
    title: "숫자 일치 자동 검증",
    desc: "인보이스 ↔ 패킹리스트의 수량·금액·중량을 규칙 기반(AI 아님)으로 대조해 불일치를 빨간 목록으로 보여줍니다. 통관 지연을 부르는 실수를 발행 전에 잡습니다.",
  },
  {
    icon: ScanLine,
    title: "AI 주문서 추출",
    desc: "바이어 PO(PDF·이미지)·주문 메일에서 품목·수량·금액을 추출해 초안을 채웁니다. 추출만 하고 판단은 사람이 — 저장 전 항상 검토·수정할 수 있습니다.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const authed = Boolean(user);
  const startHref = authed ? "/dashboard" : "/signup";

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader authed={authed} />

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-accent/40 to-background">
        <div className="container flex flex-col items-center gap-6 py-20 text-center sm:py-28">
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            소규모 수출자를 위한 서류 자동화
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            주문서 하나로 인보이스·패킹리스트 한 번에,
            <br className="hidden sm:block" /> 숫자 불일치는 자동으로 잡아드려요
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground">
            바이어와 수출건을 관리하고, 한 벌의 데이터로 표준 영문 서류를 일관되게 발행하세요.
            서류 간 숫자는 발행 전에 자동으로 대조합니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={startHref}>
                무료로 시작 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">요금제 보기</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            신용카드 없이 시작 · UI 한국어 · 서류 출력물 영문(무역 표준)
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            입력은 한 번, 서류는 여러 장 — 그리고 틀리지 않게
          </h2>
          <p className="mt-3 text-muted-foreground">
            반복 입력과 대조 확인에 쓰던 시간을 줄여드립니다.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-6 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-teal">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30 py-20">
        <div className="container max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">요금제</h2>
            <p className="mt-3 text-muted-foreground">
              무료로 시작하고, 수출 물량이 늘면 Pro로 업그레이드하세요.
            </p>
          </div>
          <PlanComparison
            freeCta={
              <Button asChild variant="outline" className="w-full">
                <Link href={startHref}>{authed ? "대시보드로" : "무료로 시작"}</Link>
              </Button>
            }
            proCta={
              <Button asChild className="w-full">
                <Link href={authed ? "/billing" : "/signup"}>
                  {authed ? "결제 관리" : "Pro로 시작"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            전체 요금 비교는{" "}
            <Link href="/pricing" className="font-medium text-foreground underline-offset-4 hover:underline">
              요금제 페이지
            </Link>
            에서 확인하세요.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="flex flex-col items-center gap-5 rounded-2xl border bg-primary px-6 py-14 text-center text-primary-foreground">
          <h2 className="max-w-xl text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            오늘 첫 수출 서류를 만들어보세요
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/80">
            가입하면 바로 바이어·수출건을 등록하고 표준 영문 서류를 발행할 수 있습니다.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href={startHref}>
              무료로 시작 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
