-- ─────────────────────────────────────────────────────────────────────────────
-- Extraction memory — "쓸수록 똑똑해지는" 학습 루프
--
-- When a user confirms/corrects an AI-extracted order line into a real product,
-- we remember the buyer's original wording → product as an alias. Next time the
-- same buyer's order uses that wording, matching references the alias FIRST
-- (a free DB lookup — no extra AI calls), raising accuracy over time.
--
-- This is NOT model fine-tuning; it's history accumulated in our own DB.
-- buyer_id is nullable: a null alias is a workspace-wide ("global") fallback.
-- source_text is stored normalised (see lib/ai/match.ts normalizeSourceText).
-- ★ Aliases must NEVER leak across workspaces — RLS + explicit workspace filter.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.extraction_aliases (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  buyer_id          uuid references public.buyers (id) on delete cascade,
  source_text       text not null,                       -- normalised buyer wording
  product_id        uuid not null references public.products (id) on delete cascade,
  times_seen        int  not null default 1,
  last_confirmed_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger set_updated_at before update on public.extraction_aliases
  for each row execute function public.set_updated_at();

-- One alias per (workspace, buyer, wording). NULLS NOT DISTINCT (Postgres 15+)
-- so a global alias (buyer_id null) also dedupes and supports upsert via this
-- single, non-partial index — ON CONFLICT (workspace_id, buyer_id, source_text).
create unique index extraction_aliases_uidx
  on public.extraction_aliases (workspace_id, buyer_id, source_text) nulls not distinct;

-- Fast per-buyer reads (the lookup index above already covers most reads).
create index extraction_aliases_buyer_idx
  on public.extraction_aliases (workspace_id, buyer_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Operational tenant data: active members get full CRUD, strictly workspace-
-- scoped. is_workspace_member() is SECURITY DEFINER (no recursion).
alter table public.extraction_aliases enable row level security;

create policy extraction_aliases_select on public.extraction_aliases
  for select using (public.is_workspace_member(workspace_id));
create policy extraction_aliases_insert on public.extraction_aliases
  for insert with check (public.is_workspace_member(workspace_id));
create policy extraction_aliases_update on public.extraction_aliases
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy extraction_aliases_delete on public.extraction_aliases
  for delete using (public.is_workspace_member(workspace_id));

-- ── Learn upsert ─────────────────────────────────────────────────────────────
-- Atomic "remember this confirmed match" — INSERT, or on repeat bump times_seen
-- and refresh last_confirmed_at (and update product_id if the user corrected it).
-- SECURITY INVOKER (default): RLS above still applies, so a caller can only write
-- aliases for a workspace they belong to. p_entries: [{source_text, product_id}].
create or replace function public.learn_extraction_aliases(
  p_workspace_id uuid,
  p_buyer_id uuid,
  p_entries jsonb
)
returns integer
language plpgsql
set search_path = public as $$
declare
  e jsonb;
  n integer := 0;
  v_source text;
  v_product uuid;
begin
  for e in select * from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) loop
    v_source := trim(e->>'source_text');
    if v_source is null or v_source = '' or (e->>'product_id') is null then
      continue;
    end if;
    v_product := (e->>'product_id')::uuid;

    insert into public.extraction_aliases (workspace_id, buyer_id, source_text, product_id)
    values (p_workspace_id, p_buyer_id, v_source, v_product)
    on conflict (workspace_id, buyer_id, source_text) do update set
      product_id        = excluded.product_id,
      times_seen        = public.extraction_aliases.times_seen + 1,
      last_confirmed_at = now(),
      updated_at        = now();

    n := n + 1;
  end loop;
  return n;
end;
$$;

grant execute on function public.learn_extraction_aliases(uuid, uuid, jsonb) to authenticated;
