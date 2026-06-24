-- ─────────────────────────────────────────────────────────────────────────────
-- Soft delete for buyers & shipments
--
-- We never hard-delete tenant records that may be referenced by documents or
-- history. App queries filter `deleted_at is null`; RLS is unchanged (still
-- workspace-scoped). The shipment ref_no uniqueness is relaxed to ignore
-- soft-deleted rows so a reference number can be reused after deletion.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.buyers    add column if not exists deleted_at timestamptz;
alter table public.shipments add column if not exists deleted_at timestamptz;

-- Only consider live rows in common listing queries.
create index if not exists buyers_active_idx
  on public.buyers (workspace_id) where deleted_at is null;
create index if not exists shipments_active_idx
  on public.shipments (workspace_id) where deleted_at is null;

-- Replace the plain unique constraint with a partial unique index on live rows.
alter table public.shipments drop constraint if exists shipments_workspace_id_ref_no_key;
create unique index if not exists shipments_ws_refno_active_idx
  on public.shipments (workspace_id, ref_no) where deleted_at is null;
