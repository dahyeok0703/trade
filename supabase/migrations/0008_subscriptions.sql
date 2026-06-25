-- ─────────────────────────────────────────────────────────────────────────────
-- Subscription billing (PortOne)
--
-- One subscription per workspace. Owner-initiated subscribe/cancel/resume run in
-- the owner's session (RLS owner CRUD). Webhook renewals/failures are written by
-- the service role (RLS bypass). billing_events gains an event_id for webhook
-- idempotency. The plan gate of record stays `workspaces.plan`.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null unique references public.workspaces (id) on delete cascade,
  provider             text not null default 'portone',
  plan                 public.workspace_plan not null default 'free',
  status               text not null default 'none',  -- none/active/canceled/past_due
  billing_key          text,                          -- payment credential (server-only)
  customer_key         text,
  card_brand           text,
  card_last4           text,
  current_period_end   date,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Webhook idempotency: one row per provider event id. Plain unique index —
-- NULLs are distinct in Postgres, so owner-initiated events (event_id null)
-- never conflict, while provider event ids dedupe.
alter table public.billing_events add column if not exists event_id text;
create unique index if not exists billing_events_event_id_uidx
  on public.billing_events (event_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions
  for select using (public.is_workspace_owner(workspace_id));
create policy subscriptions_insert on public.subscriptions
  for insert with check (public.is_workspace_owner(workspace_id));
create policy subscriptions_update on public.subscriptions
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));
create policy subscriptions_delete on public.subscriptions
  for delete using (public.is_workspace_owner(workspace_id));
