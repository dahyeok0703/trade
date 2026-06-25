import type { Metadata } from "next";

import { LegalShell } from "@/components/public/legal-shell";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "이용약관",
  description: "TradeDocs 서비스 이용약관(초안).",
  alternates: { canonical: "/terms" },
};

/* TODO(법률 검토 필요): 아래 조항은 표준 SaaS 약관 골격의 플레이스홀더입니다.
   전자상거래 등에서의 소비자보호에 관한 법률, 약관규제법 등에 따른 전문 검토 필수. */
export default async function TermsPage() {
  const authed = Boolean(await getCurrentUser());

  return (
    <LegalShell authed={authed} title="이용약관" updatedAt="2026-06-25">
      <section>
        <h2>제1조 (목적)</h2>
        <p>
          본 약관은 TradeDocs(이하 “회사”)가 제공하는 수출 서류 작성 보조 서비스(이하 “서비스”)의
          이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section>
        <h2>제2조 (서비스의 성격 및 한계)</h2>
        <p>
          서비스는 인보이스·패킹리스트 등 수출 서류의 <strong>작성을 보조</strong>하는 도구입니다.
          다음 사항은 서비스의 범위에 포함되지 않습니다.
        </p>
        <ul>
          <li>
            <strong>HS코드·관세율·통관 분류의 확정</strong>: 해당 사항은
            <strong> 관세사(licensed customs broker)의 영역</strong>이며, 회사는 이를 확정·보장하지
            않습니다. 서비스가 제공하는 참고 정보는 법적 효력이 없습니다.
          </li>
          <li>
            <strong>거래의 적법성·규정 준수·가격 적정성 판단</strong>: 서비스의 AI 기능은 주문서에서
            항목을 추출·정리할 뿐 거래 가부나 적법성을 판단하지 않습니다.
          </li>
          <li>공식 회계·세무·통관 신고의 대체.</li>
        </ul>
      </section>

      <section>
        <h2>제3조 (이용자의 책임)</h2>
        <p>
          생성된 모든 서류의 정확성에 대한 <strong>최종 검토 및 사용 책임은 이용자(수출자)에게</strong>
          있습니다. 이용자는 입력 데이터의 정확성을 보장하며, 필요한 경우 관세사·세무사 등 전문가의
          확인을 받아야 합니다.
        </p>
      </section>

      <section>
        <h2>제4조 (요금 및 결제)</h2>
        <p>
          유료 플랜의 요금·결제 주기·환불은 요금제 페이지 및 환불정책에 따릅니다. 정기결제는
          PortOne(포트원)을 통해 처리됩니다.
        </p>
      </section>

      <section>
        <h2>제5조 (책임의 제한)</h2>
        <p>
          회사는 관계 법령이 허용하는 범위 내에서, 서비스가 생성한 서류의 오류나 이를 사용함으로써
          발생한 통관 지연·손해에 대해 책임을 지지 않습니다. (※ 책임 제한 범위는 법률 검토 필요)
        </p>
      </section>

      <section>
        <h2>제6조 (약관의 변경)</h2>
        <p>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 변경 시 사전 공지합니다.</p>
      </section>
    </LegalShell>
  );
}
