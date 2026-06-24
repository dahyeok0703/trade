-- ─────────────────────────────────────────────────────────────────────────────
-- TradeDocs — full schema
--
-- Multi-tenancy: workspace (수출 업체) is the tenant root. Every other table
-- carries `workspace_id` and is isolated by Row Level Security (see 0002_rls.sql).
-- Child tables denormalise `workspace_id` so RLS is a single, index-backed check
-- and never has to join up to the parent.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.member_role as enum ('owner', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active', 'invited', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workspace_plan as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shipment_status as enum ('draft', 'documents_ready', 'shipped', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trade_doc_type as enum (
    'commercial_invoice', 'packing_list', 'certificate_of_origin', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_term as enum ('TT', 'LC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'partial', 'paid', 'overdue');
exception when duplicate_object then null; end $$;

-- ── updated_at trigger helper ────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Tenant root ──────────────────────────────────────────────────────────────

create table public.workspaces (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 120),
  slug                text not null unique,
  -- 수출자 정보 (영문 상호·주소·연락처). Shape, e.g.
  -- { "company_en": "...", "address_en": "...", "tel": "...", "email": "..." }
  exporter_info       jsonb not null default '{}'::jsonb,
  plan                public.workspace_plan not null default 'free',
  trial_ends_at       timestamptz,
  billing_customer_id text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text,
  role          public.member_role not null default 'staff',
  status        public.member_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ── Master data ──────────────────────────────────────────────────────────────

create table public.buyers (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name_en       text not null check (char_length(name_en) between 1 and 200),
  address_en    text,
  country       text,
  -- { "person": "...", "email": "...", "tel": "..." }
  contact       jsonb not null default '{}'::jsonb,
  -- Notify party for B/L; same shape as a buyer contact block.
  notify_party  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  name_en         text not null check (char_length(name_en) between 1 and 200),
  hs_code         text,                          -- 참고용. 통관 확정은 관세사 영역.
  unit            text not null default 'EA',
  unit_price_usd  numeric(14, 2) not null default 0,
  net_weight      numeric(14, 3),                -- kg
  gross_weight    numeric(14, 3),                -- kg
  dimensions      text,                          -- e.g. "40 x 30 x 25 cm"
  origin_country  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Shipments (수출건) ────────────────────────────────────────────────────────

create table public.shipments (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  buyer_id           uuid references public.buyers (id) on delete set null,
  ref_no             text not null,
  incoterms          text,                       -- FOB / CIF / EXW ...
  currency           text not null default 'USD',
  port_of_loading    text,
  port_of_discharge  text,
  etd                date,
  lc_no              text,
  status             public.shipment_status not null default 'draft',
  memo               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (workspace_id, ref_no)
);

create table public.shipment_items (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  shipment_id     uuid not null references public.shipments (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  description_en  text not null,
  qty             numeric(14, 3) not null default 0,
  unit            text not null default 'EA',
  unit_price      numeric(14, 2) not null default 0,
  amount          numeric(16, 2) not null default 0,
  net_weight      numeric(14, 3),
  gross_weight    numeric(14, 3),
  ctns            integer,                        -- 박스(carton) 수
  hs_code         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Documents, validation, payments ──────────────────────────────────────────

create table public.trade_documents (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  shipment_id    uuid not null references public.shipments (id) on delete cascade,
  doc_type       public.trade_doc_type not null,
  doc_no         text,
  issued_on      date,
  file_path      text,                            -- Storage object path
  data_snapshot  jsonb not null default '{}'::jsonb,  -- rendered document payload
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 서류 일치 검증 결과 (규칙 기반). `result` is the list of mismatches.
create table public.validations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  shipment_id   uuid not null references public.shipments (id) on delete cascade,
  run_at        timestamptz not null default now(),
  result        jsonb not null default '[]'::jsonb,
  passed        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 대금 추적
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  shipment_id   uuid not null references public.shipments (id) on delete cascade,
  term          public.payment_term not null,
  amount        numeric(16, 2) not null default 0,
  due_on        date,
  paid_on       date,
  status        public.payment_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── System / ops tables (owner-only read) ────────────────────────────────────

-- AI 사용량 집계 (마진 보호). One row per workspace per month.
create table public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  month         date not null,                   -- first day of the month
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  doc_count     integer not null default 0,
  est_cost_krw  numeric(14, 2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, month)
);

create table public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  actor_member_id  uuid references public.members (id) on delete set null,
  action           text not null,
  target_table     text,
  target_id        uuid,
  meta             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create table public.billing_events (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  type          text not null,
  raw           jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- ── Indexes (workspace_id + common lookups) ──────────────────────────────────

create index members_user_id_idx          on public.members (user_id);
create index members_workspace_idx        on public.members (workspace_id);
create index buyers_workspace_idx         on public.buyers (workspace_id);
create index products_workspace_idx       on public.products (workspace_id);
create index shipments_workspace_idx      on public.shipments (workspace_id);
create index shipments_buyer_idx          on public.shipments (buyer_id);
create index shipment_items_workspace_idx on public.shipment_items (workspace_id);
create index shipment_items_shipment_idx  on public.shipment_items (shipment_id);
create index trade_documents_workspace_idx on public.trade_documents (workspace_id);
create index trade_documents_shipment_idx on public.trade_documents (shipment_id);
create index validations_workspace_idx    on public.validations (workspace_id);
create index validations_shipment_idx     on public.validations (shipment_id);
create index payments_workspace_idx       on public.payments (workspace_id);
create index payments_shipment_idx        on public.payments (shipment_id);
create index ai_usage_workspace_idx       on public.ai_usage (workspace_id);
create index audit_logs_workspace_idx     on public.audit_logs (workspace_id);
create index billing_events_workspace_idx on public.billing_events (workspace_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────

create trigger set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.buyers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.shipment_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.trade_documents
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.ai_usage
  for each row execute function public.set_updated_at();

-- ── Helper functions (SECURITY DEFINER → avoid RLS recursion on members) ─────

create or replace function public.is_workspace_member(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.workspace_id = wid
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_workspace_owner(wid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.workspace_id = wid
      and m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
  );
$$;

-- Creates a workspace and registers the caller as its owner. Used at sign-up;
-- callable only by an authenticated user, and only for themselves.
create or replace function public.bootstrap_workspace(
  workspace_name text,
  workspace_slug text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  uid    uuid := auth.uid();
  uemail text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select email into uemail from auth.users where id = uid;

  insert into public.workspaces (name, slug, plan, trial_ends_at)
  values (workspace_name, workspace_slug, 'free', now() + interval '14 days')
  returning id into new_id;

  insert into public.members (workspace_id, user_id, name, role, status)
  values (new_id, uid, split_part(coalesce(uemail, ''), '@', 1), 'owner', 'active');

  return new_id;
end;
$$;

revoke all on function public.bootstrap_workspace(text, text) from public, anon;
grant execute on function public.bootstrap_workspace(text, text) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated, anon;
grant execute on function public.is_workspace_owner(uuid) to authenticated, anon;
