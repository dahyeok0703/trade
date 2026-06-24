-- ─────────────────────────────────────────────────────────────────────────────
-- Soft delete for products
--
-- Products are master/reference data referenced by shipment_items
-- (product_id ON DELETE SET NULL). We soft-delete so historical line items keep
-- their snapshot and the product can be hidden without breaking references.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.products add column if not exists deleted_at timestamptz;

create index if not exists products_active_idx
  on public.products (workspace_id) where deleted_at is null;
