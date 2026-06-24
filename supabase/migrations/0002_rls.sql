-- ─────────────────────────────────────────────────────────────────────────────
-- TradeDocs — Row Level Security
--
-- Rule of thumb:
--   • Operational tables → any ACTIVE member of the workspace can CRUD.
--   • workspaces          → members read; owners update.
--   • members             → members read; owners manage (insert/update/delete).
--   • ai_usage / billing_events / audit_logs → OWNER read only.
--       (system writes go through the service role, which bypasses RLS.)
--       audit_logs additionally allows members to INSERT so the app can log.
--
-- All checks go through is_workspace_member()/is_workspace_owner(), which are
-- SECURITY DEFINER and therefore do not recurse through these policies.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.workspaces      enable row level security;
alter table public.members         enable row level security;
alter table public.buyers          enable row level security;
alter table public.products        enable row level security;
alter table public.shipments       enable row level security;
alter table public.shipment_items  enable row level security;
alter table public.trade_documents enable row level security;
alter table public.validations     enable row level security;
alter table public.payments        enable row level security;
alter table public.ai_usage        enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.billing_events  enable row level security;

-- ── Operational tables: full CRUD for active members ─────────────────────────
do $$
declare
  t text;
  operational text[] := array[
    'buyers', 'products', 'shipments', 'shipment_items',
    'trade_documents', 'validations', 'payments'
  ];
begin
  foreach t in array operational loop
    execute format(
      'create policy %1$I on public.%2$I for select using (public.is_workspace_member(workspace_id));',
      t || '_select', t);
    execute format(
      'create policy %1$I on public.%2$I for insert with check (public.is_workspace_member(workspace_id));',
      t || '_insert', t);
    execute format(
      'create policy %1$I on public.%2$I for update using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));',
      t || '_update', t);
    execute format(
      'create policy %1$I on public.%2$I for delete using (public.is_workspace_member(workspace_id));',
      t || '_delete', t);
  end loop;
end $$;

-- ── workspaces: members read, owners update ──────────────────────────────────
create policy workspaces_select on public.workspaces
  for select using (public.is_workspace_member(id));
create policy workspaces_update on public.workspaces
  for update using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));

-- ── members: members read, owners manage ─────────────────────────────────────
create policy members_select on public.members
  for select using (public.is_workspace_member(workspace_id));
create policy members_insert on public.members
  for insert with check (public.is_workspace_owner(workspace_id));
create policy members_update on public.members
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));
create policy members_delete on public.members
  for delete using (public.is_workspace_owner(workspace_id));

-- ── ai_usage: owner read only (writes via service role) ──────────────────────
create policy ai_usage_select on public.ai_usage
  for select using (public.is_workspace_owner(workspace_id));

-- ── billing_events: owner read only (writes via service role) ────────────────
create policy billing_events_select on public.billing_events
  for select using (public.is_workspace_owner(workspace_id));

-- ── audit_logs: owner read; members may append ───────────────────────────────
create policy audit_logs_select on public.audit_logs
  for select using (public.is_workspace_owner(workspace_id));
create policy audit_logs_insert on public.audit_logs
  for insert with check (public.is_workspace_member(workspace_id));
