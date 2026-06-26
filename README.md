# TradeDocs — 수출 서류 자동화

소규모 수출자를 위한 B2B SaaS. 인보이스·패킹리스트 등 수출 서류를 빠르고 정확하게
만듭니다. UI는 한국어, 생성되는 서류 출력물은 영문(무역 표준)입니다.

> 인증·멀티테넌시(RLS)·바이어/제품/수출건 관리·서류 세트(인보이스·패킹리스트) 생성·
> 규칙 기반 일치검증·영문 PDF 발행·AI 주문서 추출·선적/대금/대시보드·구독 결제(PortOne)·
> 공개 랜딩/약관까지 갖춘 **출시 준비 단계**입니다. 출시 전 점검은 [`LAUNCH.md`](./LAUNCH.md) 참고.

## 스택

- **Next.js 15** (App Router, TypeScript strict) — 서버 컴포넌트 + Server Actions
- **Supabase** — Postgres + Auth + Storage (Row Level Security)
- **Tailwind CSS** + **shadcn/ui** + lucide-react + sonner
- **react-hook-form** + **zod**
- **@react-pdf/renderer** (영문 PDF) · **recharts** (대시보드 차트) · **xlsx**(엑셀)
- **Anthropic**(AI 항목 추출, 선택) · **PortOne**(구독 결제, 선택)
- **pnpm**

## 5분 배포 (프로덕션)

로컬 없이도 클라우드 3종으로 바로 띄울 수 있습니다.

1. **Supabase 프로젝트 생성** — [supabase.com](https://supabase.com)에서 새 프로젝트를
   만들고 `Settings → API`에서 **Project URL**, **anon key**, **service_role key**를 복사합니다.
2. **마이그레이션 적용** — 로컬에서 프로젝트를 연결하고 푸시합니다(스키마+RLS 전체 반영):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push        # supabase/migrations/0001~0008 적용
   ```
   (대시보드 SQL Editor에 `supabase/migrations/*.sql`를 순서대로 붙여넣어도 됩니다.
   데모 데이터가 필요 없으면 `seed.sql`은 적용하지 마세요.)
3. **키 3종 + 배포** — [Vercel](https://vercel.com)에 이 저장소를 임포트하고 환경변수에
   최소 3종을 넣으면 동작합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

   `NEXT_PUBLIC_APP_URL`에 배포 도메인을 넣고(예: `https://app.example.com`), Supabase
   `Authentication → URL Configuration`의 **Site URL/Redirect URLs**에 같은 도메인을 등록하면
   이메일 인증 링크가 올바르게 동작합니다. AI 추출·결제·크론은 아래 선택 키를 추가하면
   켜집니다(없으면 우아하게 비활성화). 자세한 체크리스트는 [`LAUNCH.md`](./LAUNCH.md).

## 빠른 시작 (로컬)

### 사전 준비

- Node.js 20+ , [pnpm](https://pnpm.io) 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (Docker 필요)

### 1) 의존성 설치

```bash
pnpm install
```

### 2) 로컬 Supabase 실행

```bash
supabase start
```

출력에 표시되는 **API URL**, **anon key**, **service_role key** 를 복사합니다.
(`supabase status` 로 다시 확인할 수 있습니다.)

마이그레이션은 `supabase start` 시 자동 적용됩니다. 이후 변경 시:

```bash
supabase db reset   # supabase/migrations 전체 재적용
```

### 3) 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 을 위 값으로 채웁니다.

### 4) 개발 서버 실행

```bash
pnpm dev
```

http://localhost:3000 접속 → **회원가입**하면 워크스페이스가 자동 생성되고
owner로 등록됩니다. (로컬 설정은 이메일 확인이 꺼져 있어 가입 즉시 로그인됩니다.
확인 메일 흐름은 http://localhost:54324 의 로컬 메일함에서 확인합니다.)

## 환경변수

| 변수 | 필수 | 노출 | 설명 |
| --- | :---: | :---: | --- |
| `NEXT_PUBLIC_APP_URL` | 권장 | 클라이언트 | 앱 기본 URL (이메일 리다이렉트 등). 기본값 `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | 클라이언트 | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 클라이언트 | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 선택 | 서버 전용 | RLS 우회용 관리자 키. 클라이언트에 절대 노출 금지 |
| `ANTHROPIC_API_KEY` | 선택 | 서버 전용 | AI 항목 추출용. 없으면 해당 기능이 우아하게 비활성화됨 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | 선택 | 클라이언트 | PortOne 상점 ID (빌링키 발급용) |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 선택 | 클라이언트 | PortOne 채널 키 |
| `PORTONE_API_SECRET` | 선택 | 서버 전용 | 정기결제 API 시크릿. 없으면 결제가 "준비중"으로 비활성화됨 |
| `PORTONE_WEBHOOK_SECRET` | 선택 | 서버 전용 | 웹훅 서명 검증 시크릿(`whsec_…`) |
| `CRON_SECRET` | 선택 | 서버 전용 | 크론(ETD/대금 알림) 인증 시크릿. 없으면 크론 라우트 비활성(503) |

> 환경변수는 `src/lib/env.ts` 에서 zod로 검증됩니다. 필수 값이 없으면 시작 시 명확한
> 오류를 던집니다. 선택 키가 없으면 관련 기능이 비활성화됩니다.

## 스크립트

```bash
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm start        # 빌드된 앱 실행
pnpm typecheck    # 타입 체크 (tsc --noEmit)
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm db:types     # Supabase 로컬 기준 DB 타입 재생성
```

## 데이터베이스 (스키마 · RLS · 시드 · 테스트)

### 멀티테넌시 모델

```
workspace (수출 업체)  ─ exporter_info, plan(free/pro), trial_ends_at, billing_customer_id
  ├─ member (직원, role: owner|staff, status)
  ├─ buyer (바이어/수입자)            ├─ product (제품마스터)
  └─ shipment (수출건) ──┬─ shipment_item (품목)
                         ├─ trade_document (CI/PL/CO/기타)
                         ├─ validation (서류 일치 검증 결과)
                         └─ payment (대금: TT/LC)
시스템: ai_usage(마진 추적) · audit_logs · billing_events
```

**모든 테이블이 `workspace_id` 를 가지며 Postgres RLS 로 격리**됩니다. 정책 요약:

| 분류 | 테이블 | staff | owner |
| --- | --- | --- | --- |
| 운영 데이터 | buyers, products, shipments, shipment_items, trade_documents, validations, payments | CRUD | CRUD |
| 워크스페이스 | workspaces | 읽기 | 읽기 + 수정 |
| 멤버 | members | 읽기 | 읽기 + 관리 |
| 시스템 | ai_usage, billing_events | ✕ | **읽기 전용** |
| 감사 | audit_logs | 추가(append) | **읽기** |

> 시스템 테이블 쓰기는 service-role(=RLS 우회)로만 수행합니다.

### 마이그레이션 적용

```bash
supabase start          # 최초 기동 시 마이그레이션 + 시드 자동 적용
supabase db reset       # 마이그레이션 전체 재적용 + 시드 재실행
```

- `supabase/migrations/0001_schema.sql` — 테이블·enum·인덱스·트리거·헬퍼 함수·`bootstrap_workspace()`
- `supabase/migrations/0002_rls.sql` — 전체 RLS 정책
- `supabase/migrations/0003_soft_delete.sql` — buyers·shipments soft delete
- `supabase/migrations/0004_products_soft_delete.sql` — products soft delete
- `supabase/migrations/0005_items_cbm_payment_terms.sql` — 품목 CBM·서류 결제조건
- `supabase/migrations/0006_ai_usage_rpc.sql` — AI 사용량 기록·월 추출 횟수 RPC (마진 보호)
- `supabase/migrations/0007_shipment_tracking.sql` — 선적 추적(ETA·B/L)
- `supabase/seed.sql` — 데모 데이터 (업체 1 · 바이어 1 · 제품 5 · 수출건 1 + 품목/서류/검증/대금)

### 데모 로그인

시드가 데모 계정을 함께 생성합니다(로컬 전용):

```
email:    demo@tradedocs.test
password: demo12345
```

### DB 타입 재생성

```bash
pnpm db:types   # supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

### RLS 격리 통합테스트

```bash
supabase test db   # supabase/tests/rls_isolation.test.sql (pgTAP, 17 assertions)
```

타 workspace 간 읽기/쓰기 차단, staff 제한, owner 전용 읽기, anon 차단을 검증합니다.

자세한 원칙은 [`CLAUDE.md`](./CLAUDE.md) 를 참고하세요.

## 서류 일치검증 (규칙 기반 · 핵심)

"서류 보내기 전에 불일치를 잡아 **통관 지연을 방지**한다"가 핵심 가치입니다. 인보이스와
패킹리스트가 **같은 품목 데이터**에서 생성되므로 교차 산술은 구조적으로 일치하며, 엔진은
실제 지연을 유발하는 **데이터 품질**을 점검합니다. (`src/lib/validation/rules.ts`, AI 아님)

- 총 수량/총 금액 일치, 라인 금액 = 수량 × 단가
- 총 순중량·총중량, 박스수(CTNS)·용적(CBM) 누락·불일치(총중량 ≥ 순중량)
- 필수 항목: Shipper·Consignee·Notify·인코텀즈·선적/도착항
- HS코드·원산지(제품마스터 연결) — 참고용 경고
- **error**(불일치)는 빨간색으로 차단, **warning**(확인 권장)은 통과 허용

수출건 상세 [일치검증] 탭에서 **검증 실행** → 통과/실패가 한눈에. **검증을 통과해야**
`documents_ready`로 전환되며, 경고가 있어도 확인 후 **강제 진행**할 수 있습니다. 실행 결과는
`validations` 테이블에 이력으로 남습니다.

## 선적 추적 · 대금 · 대시보드

- **선적 추적**: 수출건 상태(draft → documents_ready → shipped → done), ETD/ETA, B/L 번호·메모
- **대금**(수출건 [대금] 탭): T/T·L/C 구분·금액·만기·입금일 → 받을 대금/연체 자동 집계
  (연체 = 미입금 & 만기 경과). 통화별로 합산합니다.
- **대시보드**(`/dashboard`): 진행 중 수출건·이번 달 ETD·받을 대금/연체, 서류 미검증·불일치
  경고 리스트, 바이어별·월별 수출 금액 차트(recharts). 모바일 대응.
- ⚠️ **금액·일정은 입력값 기반 참고치이며 공식 통관·회계를 대체하지 않습니다.**

## 수출 서류 PDF

같은 품목 데이터에서 **표준 영문 PDF**를 서버에서 생성합니다(`@react-pdf/renderer`).

- **Commercial Invoice** · **Packing List** · **Certificate of Origin**(참고 양식)
- `GET /api/documents/{shipmentId}/{invoice|packing-list|certificate-of-origin}`
  — `?dl=1` 이면 다운로드, 없으면 브라우저 인라인 미리보기
- 수출건 상세 [서류] 탭에서 미리보기·PDF 다운로드·**발행**(이력 기록)
- 발행 시 `trade_documents`에 `doc_no`·`issued_on`·`data_snapshot`(문서 모델 JSON) 저장
- 설정(owner)에서 **수출자 정보·로고·서명 이미지**를 등록하면 PDF 헤더/서명에 반영됩니다
  (이미지는 `exporter_info` jsonb에 data URL로 저장)
- 숫자·통화는 영문 표준 포맷(그룹 구분, 2자리 소수). 서류 양식은 일반적 무역 표준을
  따르되 **최종 사용 책임은 수출자에게** 있음을 서류·UI에 명시합니다.

## AI 주문서 추출 (선택)

바이어 PO(PDF·이미지)·주문 이메일·엑셀에서 **품목 후보를 추출**해 수출건 품목 화면의
"주문서로 채우기"로 불러옵니다. 추출 결과는 **초안**이며 저장 전 사람이 검토·수정합니다.

- **`ANTHROPIC_API_KEY` 가 없으면** AI 버튼이 숨겨지고 수동 입력만 동작합니다(앱 정상).
- 모델: **Haiku 4.5 고정**, 저신뢰/실패 시에만 **Sonnet 1회 폴백**, 시스템 프롬프트 prompt caching.
- 출력은 `output_config.format`(json_schema)로 **JSON 강제** + zod **안전 파싱**, 항목별 confidence
  표시(낮으면 "확인 필요"). PDF는 텍스트 추출 후, 이미지는 vision 분기.
- **마진 보호**: 호출마다 토큰을 `record_ai_usage()`로 `ai_usage`에 적재하고
  `src/lib/pricing/cogs.ts`(단가·환율)로 원가(KRW)를 추정. **free 플랜은 월 추출 횟수 쿼터**가
  있고 초과 시 수동 입력/업그레이드를 안내합니다. 사용량은 설정 화면(owner)에서 확인합니다.
- **AI는 항목 추출만** 합니다 — 가격 적정성·규정 준수·거래 가부 등 판단은 하지 않습니다.
- **쓸수록 똑똑해지는 학습 루프**: 추출 결과를 확정·교정해 저장하면 「바이어 표현 → 제품」을
  `extraction_aliases`에 기억합니다(정규화 후 upsert, 재확인 시 `times_seen`+1). 다음에 **같은
  바이어** 주문서를 추출하면 글자 유사도 매칭보다 **먼저 이 기억을 참조**해 정확도가 올라갑니다
  (UI에 "기억된 매칭" 표시). 모델 파인튜닝이 아니라 우리 DB 이력 참조라 **AI 호출량은 늘지 않고**
  (별칭은 무료 DB 조회), 매칭은 여전히 초안입니다. 학습 현황은 설정 화면에서 확인합니다.
  별칭은 RLS + 명시적 workspace 필터로 **다른 워크스페이스에 절대 새지 않습니다.**

## 구독 결제 (PortOne · 선택)

공개 가격 페이지 `/pricing` 와 앱 내 `/billing`(owner 전용)에서 **Free / Pro** 플랜을
관리합니다. 결제는 **PortOne(포트원) V2 빌링키 정기결제**로, 프로바이더는
`src/lib/billing/`의 **어댑터로 분리**되어 있습니다.

- **플랜 한도**(`src/lib/billing/plans.ts`, 설정값): Free 는 수출건 5개·월 AI 추출 20회·월
  검증 50회·**서류 워터마크**, Pro 는 무제한 수출건·서류 풀(워터마크 없음)·넉넉한 AI 추출·
  검증 무제한. 한도는 Server Action에서 게이팅(`gate.ts`)하고, 워터마크는 PDF 렌더 시
  플랜으로 결정합니다.
- **결제 흐름**: 브라우저에서 빌링키 발급 → `subscribeAction`이 첫 회차 결제 + 다음 회차
  예약 + `subscriptions` 적재 + `workspaces.plan='pro'` 갱신. 취소는 **기간 종료 시 해지
  예약**(즉시 차단 아님), 재개도 지원합니다.
- **웹훅** `/api/webhooks/portone`: **표준 웹훅 서명 검증**(HMAC-SHA256) 후
  `billing_events.event_id` **unique로 멱등** 처리 → 결제 성공 시 기간 연장/업그레이드,
  실패 시 `past_due`. 모든 이벤트는 `billing_events`에 기록됩니다.
- **마진 점검**: 플랜별 AI 추출 쿼터(`plans.ts`)와 `ai_usage`·`cogs.ts` 원가를 연동해
  플랜 마진을 확인합니다. 가격(`PRO_PRICE_KRW`)은 설정값입니다.
- **`PORTONE_API_SECRET` 가 없으면** 결제가 **"준비중"으로 비활성화**되고 나머지 앱은
  정상 동작합니다. `billing_key`는 결제 수단 자격증명이라 **클라이언트에 절대 노출하지
  않습니다**.

## 공개 페이지 · SEO · 크론

- **랜딩 `/`**: 히어로 + 기능(서류 세트 자동·일치 검증·AI 추출) + 요금제 + CTA.
- **요금제 `/pricing`**, **법적 고지** `/terms`·`/privacy`·`/refund`
  (⚠️ 플레이스홀더 — 출시 전 **법률 검토 필요**, HS코드·통관은 관세사 영역 면책 명시).
- **SEO**: `app/layout.tsx`의 `metadataBase`·OpenGraph·Twitter 카드, 빌드 시 생성되는
  동적 OG 이미지(`app/opengraph-image.tsx`), `robots.txt`·`sitemap.xml`(앱·API 라우트는 noindex).
- **크론**: `/api/cron/notify`가 임박 ETD·연체/임박 대금을 집계합니다. `vercel.json`에 매일
  실행으로 등록되어 있고 `CRON_SECRET`로 보호됩니다(미설정 시 비활성). 알림 발송 채널은
  미연동 상태로, 현재는 다이제스트를 로그·JSON으로 반환합니다(이메일 제공자 연동 시 발송).

## 디렉터리

```
src/app/(auth)     인증 화면 (로그인/회원가입/비번재설정)
src/app/(app)      인증 보호 영역 (대시보드·바이어·수출건·서류·설정)
src/components      UI · 인증 폼 · 앱 셸
src/lib            env · supabase · auth · actions · validations
supabase/migrations 스키마(0001) + RLS(0002) + bootstrap 함수
supabase/seed.sql   데모 시드 (데모 계정 포함)
supabase/tests      RLS 격리 pgTAP 테스트
```

## 라이선스

Private.
