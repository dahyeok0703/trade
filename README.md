# TradeDocs — 수출 서류 자동화

소규모 수출자를 위한 B2B SaaS. 인보이스·패킹리스트 등 수출 서류를 빠르고 정확하게
만듭니다. UI는 한국어, 생성되는 서류 출력물은 영문(무역 표준)입니다.

> 현재는 **프로덕션 품질의 골격(skeleton)** 단계입니다. 인증·멀티테넌시·앱 셸·디자인
> 시스템·DB(RLS)까지 갖춰져 있으며, 도메인 기능은 비어 있습니다.

## 스택

- **Next.js 15** (App Router, TypeScript strict) — 서버 컴포넌트 + Server Actions
- **Supabase** — Postgres + Auth + Storage (Row Level Security)
- **Tailwind CSS** + **shadcn/ui** + lucide-react + sonner
- **react-hook-form** + **zod**
- **pnpm**

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
