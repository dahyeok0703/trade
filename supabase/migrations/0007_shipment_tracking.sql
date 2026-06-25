-- ─────────────────────────────────────────────────────────────────────────────
-- Shipment tracking fields: ETA + B/L number
-- (ETD and memo already exist; payments live in their own table from 0001.)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.shipments add column if not exists eta date;
alter table public.shipments add column if not exists bl_no text;

create index if not exists payments_due_idx
  on public.payments (workspace_id, due_on) where paid_on is null;
