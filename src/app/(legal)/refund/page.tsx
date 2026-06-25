import type { Metadata } from "next";

import { LegalShell } from "@/components/public/legal-shell";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "환불정책",
  description: "TradeDocs 구독 환불정책(초안).",
  alternates: { canonical: "/refund" },
};

/* TODO(법률 검토 필요): 콘텐츠산업진흥법·전자상거래법상 청약철회·환불 규정,
   디지털 구독 서비스 환불 기준 전문 검토 필수. */
export default async function RefundPage() {
  const authed = Boolean(await getCurrentUser());

  return (
    <LegalShell authed={authed} title="환불정책" updatedAt="2026-06-25">
      <section>
        <h2>1. 구독 결제 방식</h2>
        <p>
          Pro 플랜은 월 단위 정기결제(빌링키)로 청구됩니다. 결제일에 다음 결제 주기 이용료가 자동으로
          청구됩니다.
        </p>
      </section>

      <section>
        <h2>2. 해지</h2>
        <p>
          구독은 언제든지 해지할 수 있습니다. 해지 시 <strong>현재 결제 주기가 끝나는 날까지 Pro 기능을
          계속 이용</strong>할 수 있으며, 이후 자동으로 Free 플랜으로 전환됩니다. 남은 기간에 대한
          일할 환불은 원칙적으로 제공되지 않습니다. (※ 청약철회 예외 — 법률 검토 필요)
        </p>
      </section>

      <section>
        <h2>3. 환불 가능 사유</h2>
        <ul>
          <li>회사의 귀책으로 서비스를 정상적으로 이용하지 못한 경우</li>
          <li>결제 직후 서비스를 전혀 이용하지 않은 경우(관계 법령상 청약철회 기간 내)</li>
        </ul>
      </section>

      <section>
        <h2>4. 환불 절차</h2>
        <p>
          환불 요청은 고객센터를 통해 접수하며, 확인 후 결제수단으로 환불됩니다. 환불은 PortOne(포트원)을
          통해 처리됩니다. (※ 처리 기한·수수료 기준 — 법률 검토 필요)
        </p>
      </section>

      <section>
        <h2>5. 문의</h2>
        <p>환불 및 결제 관련 문의: (※ 출시 전 고객센터 연락처 기재 필요)</p>
      </section>
    </LegalShell>
  );
}
