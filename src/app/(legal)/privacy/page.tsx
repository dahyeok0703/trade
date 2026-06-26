import type { Metadata } from "next";

import { LegalShell } from "@/components/public/legal-shell";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "TradeDocs 개인정보처리방침(초안).",
  alternates: { canonical: "/privacy" },
};

/* TODO(법률 검토 필요): 개인정보보호법에 따른 필수 고지사항(수집 항목, 보유기간,
   제3자 제공, 처리위탁, 정보주체 권리, 개인정보 보호책임자 등) 전문 검토 필수. */
export default async function PrivacyPage() {
  const authed = Boolean(await getCurrentUser());

  return (
    <LegalShell authed={authed} title="개인정보처리방침" updatedAt="2026-06-25">
      <section>
        <h2>1. 수집하는 개인정보 항목</h2>
        <ul>
          <li>회원가입: 이메일, 비밀번호(해시), 회사·상호 정보</li>
          <li>서비스 이용: 바이어·수출건·서류 데이터(이용자가 입력한 거래 정보)</li>
          <li>결제: 결제수단 일부 정보(카드사·끝 4자리 등). 카드 전체 정보는 PortOne(포트원)이 처리하며 회사는 저장하지 않습니다.</li>
        </ul>
      </section>

      <section>
        <h2>2. 개인정보의 이용 목적</h2>
        <ul>
          <li>서비스 제공(서류 작성·검증·발행) 및 계정 관리</li>
          <li>요금 결제 및 정산</li>
          <li>고객 문의 대응 및 서비스 개선</li>
        </ul>
      </section>

      <section>
        <h2>3. AI 처리에 관한 고지</h2>
        <p>
          AI 주문서 추출 기능 사용 시, 이용자가 업로드한 주문서의 내용 중 항목 추출에 필요한 최소한의
          데이터가 AI 처리 제공자(Anthropic)로 전송됩니다. 회사는 전송 데이터를 최소화하며, AI는 항목
          추출에만 사용되고 거래 판단에는 사용되지 않습니다.
        </p>
      </section>

      <section>
        <h2>4. 보유 및 이용 기간</h2>
        <p>
          회원 탈퇴 시 또는 수집·이용 목적 달성 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이
          필요한 경우 해당 기간 동안 보관합니다. (※ 구체적 보존 기간 — 법률 검토 필요)
        </p>
      </section>

      <section>
        <h2>5. 처리위탁 및 제3자 제공</h2>
        <ul>
          <li>Supabase: 데이터 저장·인증 인프라</li>
          <li>PortOne(포트원): 결제 처리</li>
          <li>Anthropic: AI 항목 추출(선택 기능 사용 시)</li>
        </ul>
      </section>

      <section>
        <h2>6. 정보주체의 권리</h2>
        <p>이용자는 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다.</p>
      </section>

      <section>
        <h2>7. 개인정보 보호책임자</h2>
        <p>(※ 출시 전 책임자 성명·연락처 기재 필요 — 법률 검토 필요)</p>
      </section>
    </LegalShell>
  );
}
