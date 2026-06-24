import Link from "next/link";
import { ArrowRight, FileCheck2, ShieldCheck, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileCheck2 className="h-4 w-4" />
            </span>
            TradeDocs
          </span>
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

      <section className="container flex flex-1 flex-col items-center justify-center gap-6 py-20 text-center">
        <span className="rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          수출 서류, 더 빠르고 정확하게
        </span>
        <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          인보이스·패킹리스트 등 수출 서류를
          <br />한 곳에서 만드세요
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          소규모 수출자를 위한 서류 자동화 도구. 바이어와 수출건을 관리하고 표준 영문 서류를
          일관되게 발행합니다.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href={user ? "/dashboard" : "/signup"}>
              시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: Table2, title: "깔끔한 데이터 표", desc: "바이어·수출건을 한눈에 관리" },
            { icon: FileCheck2, title: "표준 영문 서류", desc: "무역 표준 양식으로 출력" },
            { icon: ShieldCheck, title: "규칙 기반 검증", desc: "서류 일치 여부를 자동 점검" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border bg-card p-5 text-left">
              <Icon className="h-5 w-5 text-teal" />
              <p className="mt-3 font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TradeDocs. HS코드·통관 관련 사항은 관세사와 상담하세요.
        </div>
      </footer>
    </main>
  );
}
