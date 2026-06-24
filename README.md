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
