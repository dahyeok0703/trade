import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

/**
 * Shared shell for legal pages (terms, privacy, refund).
 *
 * NOTE (개발자): 아래 페이지 본문은 플레이스홀더입니다. 실제 서비스 출시 전
 * 반드시 변호사/노무·세무 전문가의 법률 검토를 거쳐야 합니다. (전자상거래법,
 * 개인정보보호법, 통신판매업 신고 등 적용 여부 확인 필요)
 */
export function LegalShell({
  authed,
  title,
  updatedAt,
  children,
}: {
  authed: boolean;
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader authed={authed} />
      <article className="container max-w-2xl flex-1 py-16">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">최종 업데이트: {updatedAt}</p>

        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          ※ 본 문서는 <strong>플레이스홀더(초안)</strong>이며 법적 효력을 위한 검토가 완료되지
          않았습니다. 정식 서비스 적용 전 법률 검토가 필요합니다.
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
