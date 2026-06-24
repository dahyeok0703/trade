# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude/개발자를 위한 가이드입니다.

## 서비스 정의

**TradeDocs** — 소규모 수출자를 위한 수출 서류 자동화 B2B SaaS.
인보이스(Commercial Invoice), 패킹리스트(Packing List) 등 수출 서류를 **빠르고 정확하게**
만드는 것이 목적입니다. UI는 한국어, **생성되는 서류 출력물은 영문(무역 표준)** 입니다.

무드: 국제적 · 신뢰 · 실무. 팔레트: 네이비 + 화이트 + 틸 포인트.

## 핵심 원칙 (반드시 지킬 것)

1. **멀티테넌시 = `workspace_id` + RLS.**
   모든 테넌트 데이터(buyers, shipments, 향후 documents 등)는 `workspace_id`를 가지며
   Supabase **Row Level Security**로 격리합니다. 애플리케이션 코드의 필터링에만 의존하지
   말 것 — RLS가 1차 방어선입니다. 데이터 접근은 `is_workspace_member()` 정책을 따릅니다.

2. **AI는 "주문서 항목 추출"에만 사용. 판단 금지.**
   AI(Anthropic)는 주문서/메일에서 **품목·수량·금액 같은 항목을 구조화해 추출**하는 보조
   역할만 합니다. 가격 적정성, 규정 준수, 거래 가부 등 **판단·의사결정은 하지 않습니다.**
   추출 결과는 항상 사람이 검토·수정할 수 있어야 합니다.

3. **서류 일치 검증은 규칙 기반(rule-based).**
   인보이스 ↔ 패킹리스트 수량/금액 일치 등 검증은 **결정적 규칙**으로 구현합니다.
   AI에게 "맞는지 판단"시키지 않습니다.

4. **HS코드·통관은 관세사 영역 — 확정하지 않는다.**
   HS코드 분류, 관세율, 통관 적합성은 **관세사(licensed customs broker)의 영역**입니다.
   본 서비스는 참고 정보를 보조할 수 있어도 **확정·보장하지 않으며**, UI에 그 한계를
   명시합니다.

5. **키가 없으면 우아하게 비활성화(graceful degradation).**
   선택적 통합(예: `ANTHROPIC_API_KEY`)이 없으면 해당 기능을 **크래시 없이 비활성화**하고
   UI에 "비활성" 상태로 표시합니다. `src/lib/env.ts`의 `features` 플래그를 사용합니다.

## 스택

- **Next.js 15** (App Router, TypeScript strict), 서버 컴포넌트 + Server Actions
- **Supabase**: Postgres + Auth + Storage
- **Tailwind CSS** + **shadcn/ui** (new-york), lucide-react, **sonner** 토스트
- **react-hook-form** + **zod** (검증)
- **pnpm**

## 프로젝트 구조

```
src/
  app/
    (auth)/            로그인·회원가입·비번재설정 (split 레이아웃)
    (app)/             인증 보호 영역 (앱 셸: 사이드바 + 헤더)
    auth/confirm/      이메일 링크(OTP) 확인 라우트 핸들러
    error.tsx          전역 에러 바운더리
    loading.tsx        전역 로딩 스켈레톤
  components/
    ui/                shadcn 프리미티브
    auth/              인증 폼 (client)
    app-shell/         사이드바·헤더·네비게이션
  lib/
    env.ts             zod 검증 환경변수 + features 플래그
    supabase/          client / server / admin / middleware / types
    auth/              session, bootstrap(workspace 자동 생성)
    actions/           safe-action 래퍼({ok,data,error}), auth 액션
    validations/       zod 스키마
supabase/
  migrations/
    0001_schema.sql    테이블·enum·인덱스·트리거·헬퍼·bootstrap_workspace()
    0002_rls.sql       전체 RLS 정책
  seed.sql             데모 시드 (데모 계정 demo@tradedocs.test / demo12345)
  tests/               RLS 격리 pgTAP 테스트 (supabase test db)
  config.toml          로컬 개발 설정
```

## 데이터 모델 (스키마)

테넌트 루트 `workspaces` 아래 모든 테이블이 `workspace_id` 를 가집니다.
자식 테이블도 `workspace_id` 를 **비정규화**해 RLS가 부모로 조인하지 않고
단일·인덱스 기반 검사로 끝나도록 합니다.

- **workspaces** — name, slug, exporter_info(jsonb 영문 상호·주소·연락처), plan(free/pro), trial_ends_at, billing_customer_id
- **members** — user_id, name, role(owner/staff), status(active/invited/suspended)
- **buyers** — name_en, address_en, country, contact(jsonb), notify_party(jsonb)
- **products** — name_en, hs_code(참고용), unit, unit_price_usd, net/gross_weight, dimensions, origin_country
- **shipments** — buyer_id, ref_no, incoterms, currency, port_of_loading/discharge, etd, lc_no, status(draft/documents_ready/shipped/done), memo
- **shipment_items** — shipment_id, product_id, description_en, qty, unit, unit_price, amount, net/gross_weight, ctns, hs_code
- **trade_documents** — shipment_id, doc_type, doc_no, issued_on, file_path, data_snapshot(jsonb)
- **validations** — shipment_id, run_at, result(jsonb 불일치 목록), passed
- **payments** — shipment_id, term(TT/LC), amount, due_on, paid_on, status
- **ai_usage** — month, input/output_tokens, doc_count, est_cost_krw (owner 읽기 전용, 마진 보호)
- **audit_logs** — actor_member_id, action, target_table, target_id, meta (owner 읽기 / member append)
- **billing_events** — type, raw (owner 읽기 전용)

### RLS 규칙 (`is_workspace_member()` / `is_workspace_owner()`)

- 운영 테이블(buyers·products·shipments·shipment_items·trade_documents·validations·payments):
  활성 멤버는 전체 CRUD.
- workspaces: 멤버 읽기 / **owner 수정**. members: 멤버 읽기 / **owner 관리**.
- ai_usage·billing_events·audit_logs: **owner 읽기 전용** (시스템 쓰기는 service-role).
- 헬퍼는 SECURITY DEFINER 라 members 정책을 재귀시키지 않습니다.
- 새 테넌트 테이블 추가 시 **반드시** `workspace_id` + RLS 정책을 함께 추가합니다.

## 규약

- **Server Action은 항상 `{ ok, data, error }` envelope을 반환**합니다.
  `src/lib/actions/safe-action.ts`의 `action()` / `authedAction()`으로 감쌉니다.
  - `authedAction()`은 현재 사용자 + 활성 워크스페이스 멤버십을 해석해 `workspaceId`를
    핸들러에 주입합니다. 모든 변경은 워크스페이스 범위로 수행합니다.
  - 내부 에러는 절대 클라이언트로 노출하지 않습니다. 사용자에게 보일 메시지는
    `ActionError`로 명시적으로 던집니다.
- **환경변수는 `src/lib/env.ts`를 통해서만** 접근합니다(직접 `process.env` 금지).
- 인증 세션 갱신·라우트 보호는 `middleware.ts` + `lib/supabase/middleware.ts`가 담당합니다.
- 서버 전용 모듈은 `import "server-only"`로 보호합니다.
- 새 테넌트 테이블을 추가하면 **반드시** `workspace_id` 컬럼 + RLS 정책을 함께 추가합니다.

## 자주 쓰는 명령

```bash
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
supabase start    # 로컬 Supabase (마이그레이션 + 시드 자동 적용)
supabase db reset # 마이그레이션 재적용 + 시드 재실행
supabase test db  # RLS 격리 통합테스트 (pgTAP)
pnpm db:types     # DB 타입 재생성 (supabase 로컬 실행 중일 때)
```
