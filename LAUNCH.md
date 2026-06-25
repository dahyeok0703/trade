# 출시 체크리스트 (LAUNCH.md)

TradeDocs를 실제 고객에게 공개하기 전 확인할 항목입니다. 각 항목은 **출시 차단(blocker)**
또는 **권장**으로 표시합니다. 모두 통과해야 "출시 가능" 상태입니다.

---

## 1. 인프라 · 배포

- [ ] **(blocker)** Supabase **프로덕션 프로젝트** 생성, `0001`~`0008` 마이그레이션 적용
      (`supabase db push` 또는 SQL Editor). RLS가 모든 테넌트 테이블에 적용됐는지 확인.
- [ ] **(blocker)** Vercel 프로젝트 연결, 환경변수 입력:
      - 필수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
        `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`(실도메인)
      - 선택: `ANTHROPIC_API_KEY`, PortOne 4종, `CRON_SECRET`
- [ ] **(blocker)** `pnpm build` 성공(타입·린트 포함). CI 또는 Vercel 빌드 로그 확인.
- [ ] **(권장)** Vercel 빌드의 함수 리전이 Supabase 리전과 가까운지 확인(지연 최소화).

## 2. 도메인 · 인증

- [ ] **(blocker)** 커스텀 **도메인 연결**(Vercel → Domains), HTTPS 발급 확인.
- [ ] **(blocker)** Supabase `Authentication → URL Configuration`의 **Site URL** 및
      **Redirect URLs**에 실도메인 등록(이메일 확인·비번 재설정 링크가 실도메인으로 가도록).
- [ ] **(blocker)** 프로덕션 SMTP(이메일) 설정 — Supabase 기본 메일러는 발송 제한이 큼.
      커스텀 SMTP 연결 후 가입/비번재설정 메일 실제 수신 테스트.
- [ ] **(권장)** `NEXT_PUBLIC_APP_URL`이 실도메인과 정확히 일치(OG·sitemap·robots에 반영됨).

## 3. 결제 (실거래)

- [ ] **(blocker)** PortOne **실연동 채널**(테스트 아님)로 `NEXT_PUBLIC_PORTONE_STORE_ID`,
      `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET` 설정.
- [ ] **(blocker)** **웹훅 등록**: PortOne 콘솔에서 `https://<도메인>/api/webhooks/portone`를
      등록하고 `PORTONE_WEBHOOK_SECRET` 설정. 서명 검증·**멱등 처리** 동작 확인.
- [ ] **(blocker)** 실제 카드로 **빌링키 발급 → 첫 결제 → 다음 회차 예약 → 해지/재개** 전 과정
      1회 검증. `subscriptions`·`billing_events`·`workspaces.plan` 반영 확인.
- [ ] **(권장)** 결제 실패(한도초과/만료카드) 시 `past_due` 전환 및 안내 동작 확인.

## 4. 법무 · 정책

- [ ] **(blocker)** `/terms`·`/privacy`·`/refund` **법률 검토 완료**(현재 플레이스홀더).
      전자상거래법·개인정보보호법·청약철회/환불 규정 반영, 사업자/대표자/연락처 기재.
- [ ] **(blocker)** 통신판매업 신고 등 사업자 의무 사항 확인.
- [ ] **(blocker)** **HS코드·통관 면책 문구**가 푸터·약관·관련 UI에 노출되는지 확인
      ("HS코드·통관 분류는 관세사 영역, 본 서비스는 서류 작성 보조").
- [ ] **(권장)** 개인정보 보호책임자 지정·표기, 처리위탁 현황(Supabase/PortOne/Anthropic) 고지.

## 5. 마진 · 쿼터 (AI 비용 보호)

- [ ] **(blocker)** `src/lib/billing/plans.ts`의 플랜 한도와 `PRO_PRICE_KRW`가 의도대로인지 확인.
- [ ] **(blocker)** Free **월 AI 추출 쿼터**·수출건 한도·검증 한도 게이팅이 실제로 막히는지 테스트.
- [ ] **(blocker)** Pro AI 추출 쿼터의 **최악 COGS**(`src/lib/pricing/cogs.ts`)가 Pro 가격 대비
      충분한 마진을 남기는지 계산. 마진이 얇으면 쿼터를 낮출 것.
- [ ] **(권장)** 설정 화면(owner)의 `ai_usage` 누적·원가(KRW) 표시 확인.

## 6. 크론 · 운영

- [ ] **(권장)** `CRON_SECRET` 설정 후 `vercel.json`의 `/api/cron/notify`가 스케줄대로 실행되는지
      Vercel → Cron Jobs에서 확인. (알림 발송 채널 연동은 후속 작업)
- [ ] **(권장)** Vercel 로그/Supabase 로그 모니터링, 에러 알림 채널 마련.
- [ ] **(권장)** Supabase 자동 백업(PITR) 활성화 확인.

## 7. 데이터 위생

- [ ] **(blocker)** **데모/시드 데이터 제거** — 프로덕션 DB에 `supabase/seed.sql`을 적용하지 말 것.
      이미 적용됐다면 데모 워크스페이스(`demo@tradedocs.test`)와 관련 행 삭제.
- [ ] **(blocker)** 테스트 계정·테스트 결제 흔적 정리.
- [ ] **(권장)** 프로덕션에서 `service_role` 키가 클라이언트 번들에 포함되지 않는지 확인
      (서버 전용 모듈은 `import "server-only"` 보호).

## 8. SEO · 공개 페이지

- [ ] **(권장)** `/`(랜딩), `/pricing` 실도메인에서 정상 렌더 확인.
- [ ] **(권장)** OG 이미지(`/opengraph-image`)·`/robots.txt`·`/sitemap.xml` 응답 확인,
      소셜 공유 미리보기 점검.
- [ ] **(권장)** Search Console 등록, sitemap 제출.

---

### 출시 가능 판정

위 **(blocker)** 항목이 모두 ✅면 출시 가능. 하나라도 미완료면 **출시 보류**입니다.
현 코드 기준 자동 검증 가능한 항목(빌드/타입/린트/RLS/멱등)은 통과 상태이며, 남은 blocker는
대부분 **외부 설정·법무·실거래 검증**(키 발급, 도메인, 약관 검토, 실결제 1회)입니다.
