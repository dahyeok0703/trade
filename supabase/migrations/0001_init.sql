-- ─────────────────────────────────────────────────────────────────────────────
-- TradeDocs — initial schema
-- Multi-tenancy: workspace (수출 업체) → member (직원) → buyer / shipment.
-- Every tenant-scoped row carries workspace_id and is protected by RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Member roles within a workspace.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('owner', 'staff');
  end if;
end$$;

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          public.member_role not null default 'staff',
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.buyers (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 200),
  country       text,
  contact_email text,
  address       text,
  created_at    timestamptz not null default now()
);

create table if not exists public.shipments (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  buyer_id      uuid references public.buyers (id) on delete set null,
  reference     text not null,
  status        text not null default 'draft',
  created_at    timestamptz not null default now()
);

create index if not exists members_user_id_idx on public.members (user_id);
create index if not exists buyers_workspace_id_idx on public.buyers (workspace_id);
create index if not exists shipments_workspace_id_idx on public.shipments (workspace_id);
create index if not exists shipments_buyer_id_idx on public.shipments (buyer_id);

-- ── Helpers (SECURITY DEFINER avoids RLS recursion) ──────────────────────────

-- True when the current user is a member of the given workspace.
create or replace function public.is_workspace_member(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.workspace_id = wid and m.user_id = auth.uid()
  );
$$;

-- Creates a workspace and registers the current user as its owner.
-- Used during sign-up; callable by any authenticated user for themselves only.
create or replace function public.bootstrap_workspace(
  workspace_name text,
  workspace_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.workspaces (name, slug)
  values (workspace_name, workspace_slug)
  returning id into new_id;

  insert into public.members (workspace_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

revoke all on function public.bootstrap_workspace(text, text) from public, anon;
grant execute on function public.bootstrap_workspace(text, text) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.workspaces enable row level security;
alter table public.members    enable row level security;
alter table public.buyers     enable row level security;
alter table public.shipments  enable row level security;

-- workspaces: members can read; owners can update their own workspace.
create policy "workspaces_select" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_update" on public.workspaces
  for update using (
    exists (
      select 1 from public.members m
      where m.workspace_id = id and m.user_id = auth.uid() and m.role = 'owner'
    )
  );

-- members: a user can see memberships of workspaces they belong to.
create policy "members_select" on public.members
  for select using (public.is_workspace_member(workspace_id));

-- buyers: full CRUD scoped to workspace membership.
create policy "buyers_select" on public.buyers
  for select using (public.is_workspace_member(workspace_id));
create policy "buyers_insert" on public.buyers
  for insert with check (public.is_workspace_member(workspace_id));
create policy "buyers_update" on public.buyers
  for update using (public.is_workspace_member(workspace_id));
create policy "buyers_delete" on public.buyers
  for delete using (public.is_workspace_member(workspace_id));

-- shipments: full CRUD scoped to workspace membership.
create policy "shipments_select" on public.shipments
  for select using (public.is_workspace_member(workspace_id));
create policy "shipments_insert" on public.shipments
  for insert with check (public.is_workspace_member(workspace_id));
create policy "shipments_update" on public.shipments
  for update using (public.is_workspace_member(workspace_id));
create policy "shipments_delete" on public.shipments
  for delete using (public.is_workspace_member(workspace_id));
