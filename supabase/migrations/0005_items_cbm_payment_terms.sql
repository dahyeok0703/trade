-- ─────────────────────────────────────────────────────────────────────────────
-- Line-item volume (CBM) + document payment terms
--
-- shipment_items is the SINGLE SOURCE that feeds both the Commercial Invoice
-- (amount-centric) and the Packing List (qty/weight/volume-centric). CBM is the
-- per-line cubic-metre volume needed by the packing list. payment_terms is a
-- shared document header field (e.g. "T/T 30 days after B/L").
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.shipment_items add column if not exists cbm numeric(14, 4);
alter table public.shipments      add column if not exists payment_terms text;
