import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/refund", label: "환불정책" },
];

/** Shared marketing footer with legal links + the customs/HS disclaimer. */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col gap-4 py-8 text-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-semibold">TradeDocs</span>
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          ※ TradeDocs는 수출 서류 <strong>작성을 보조</strong>하는 도구입니다. HS코드·관세율·통관
          분류의 확정은 <strong>관세사(licensed customs broker)의 영역</strong>이며, 본 서비스는 이를
          확정·보장하지 않습니다. 생성된 서류의 최종 검토·사용 책임은 수출자에게 있습니다.
        </p>
        <p className="text-xs text-muted-foreground">
          © 2026 TradeDocs. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
