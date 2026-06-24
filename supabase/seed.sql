-- ─────────────────────────────────────────────────────────────────────────────
-- TradeDocs — local seed (demo data)
--
-- Runs after migrations on `supabase start` / `supabase db reset`.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING.
--
-- Creates a demo login so you can sign in immediately:
--     email:    demo@tradedocs.test
--     password: demo12345
-- Seeded as superuser, so RLS is bypassed for these inserts.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Demo auth user (Supabase GoTrue) ─────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'demo@tradedocs.test',
  crypt('demo12345', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"company_name":"Demo Trading Co."}'::jsonb,
  now(), now()
) on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@tradedocs.test","email_verified":true}'::jsonb,
  'email', now(), now(), now()
) on conflict (provider_id, provider) do nothing;

-- ── Workspace (데모 업체) + owner member ──────────────────────────────────────
insert into public.workspaces (id, name, slug, exporter_info, plan, trial_ends_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'Demo Trading Co.',
  'demo-trading',
  '{"company_en":"Demo Trading Co., Ltd.","address_en":"15F, 123 Teheran-ro, Gangnam-gu, Seoul, 06234, South Korea","tel":"+82-2-1234-5678","email":"export@demotrading.co"}'::jsonb,
  'pro',
  now() + interval '14 days'
) on conflict (id) do nothing;

insert into public.members (id, workspace_id, user_id, name, role, status)
values (
  '22222222-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Demo Owner', 'owner', 'active'
) on conflict (workspace_id, user_id) do nothing;

-- ── Buyer (바이어 1) ──────────────────────────────────────────────────────────
insert into public.buyers (id, workspace_id, name_en, address_en, country, contact, notify_party)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Global Import LLC',
  '880 Wilshire Blvd, Suite 700, Los Angeles, CA 90017, USA',
  'United States',
  '{"person":"John Carter","email":"john@globalimport.com","tel":"+1-213-555-0100"}'::jsonb,
  '{"company":"Global Import LLC","same_as_buyer":true}'::jsonb
) on conflict (id) do nothing;

-- ── Products (제품 5) ─────────────────────────────────────────────────────────
insert into public.products
  (id, workspace_id, name_en, hs_code, unit, unit_price_usd, net_weight, gross_weight, dimensions, origin_country)
values
  ('55555555-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Cotton T-Shirt','6109.10','PC', 5.50, 0.200, 0.250,'30 x 25 x 2 cm','South Korea'),
  ('55555555-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Denim Jeans','6203.42','PC',18.00, 0.600, 0.700,'35 x 30 x 5 cm','South Korea'),
  ('55555555-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','Wool Sweater','6110.11','PC',25.00, 0.500, 0.600,'35 x 30 x 4 cm','South Korea'),
  ('55555555-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','Leather Belt','4203.30','PC',12.00, 0.150, 0.200,'40 x 8 x 2 cm','South Korea'),
  ('55555555-0000-0000-0000-000000000005','22222222-2222-2222-2222-222222222222','Canvas Sneakers','6404.19','PR',22.00, 0.800, 0.900,'33 x 22 x 13 cm','South Korea')
on conflict (id) do nothing;

-- ── Shipment (수출건 1) ───────────────────────────────────────────────────────
insert into public.shipments
  (id, workspace_id, buyer_id, ref_no, incoterms, currency, port_of_loading, port_of_discharge, etd, lc_no, status, memo)
values (
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'EXP-2026-0001', 'FOB', 'USD',
  'Busan, South Korea', 'Los Angeles, USA',
  (now() + interval '21 days')::date, null, 'draft',
  'First demo shipment. Verify CI/PL before booking.'
) on conflict (id) do nothing;

-- ── Shipment items (총액 USD 18,900.00) ───────────────────────────────────────
insert into public.shipment_items
  (id, workspace_id, shipment_id, product_id, description_en, qty, unit, unit_price, amount, net_weight, gross_weight, ctns, hs_code)
values
  ('44444444-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444','55555555-0000-0000-0000-000000000001','Cotton T-Shirt, 100% cotton, assorted sizes',1000,'PC', 5.50,  5500.00, 200.000, 250.000, 50,'6109.10'),
  ('44444444-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444','55555555-0000-0000-0000-000000000002','Denim Jeans, 5-pocket, assorted sizes',        500,'PC',18.00,  9000.00, 300.000, 350.000, 50,'6203.42'),
  ('44444444-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444','55555555-0000-0000-0000-000000000005','Canvas Sneakers, unisex, assorted sizes',      200,'PR',22.00,  4400.00, 160.000, 180.000, 20,'6404.19')
on conflict (id) do nothing;

-- ── A draft commercial invoice, a passing validation, a pending payment ──────
insert into public.trade_documents
  (id, workspace_id, shipment_id, doc_type, doc_no, issued_on, data_snapshot)
values (
  '44444444-0000-0000-0000-0000000000d1',
  '22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444',
  'commercial_invoice','CI-2026-0001', now()::date,
  '{"total_amount":18900.00,"currency":"USD","incoterms":"FOB Busan"}'::jsonb
) on conflict (id) do nothing;

insert into public.validations (id, workspace_id, shipment_id, result, passed)
values (
  '44444444-0000-0000-0000-0000000000e1',
  '22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444',
  '[]'::jsonb, true
) on conflict (id) do nothing;

insert into public.payments (id, workspace_id, shipment_id, term, amount, due_on, status)
values (
  '44444444-0000-0000-0000-0000000000f1',
  '22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444',
  'TT', 18900.00, (now() + interval '30 days')::date, 'pending'
) on conflict (id) do nothing;

-- ── AI usage seed (마진 추적 예시) ────────────────────────────────────────────
insert into public.ai_usage (workspace_id, month, input_tokens, output_tokens, doc_count, est_cost_krw)
values (
  '22222222-2222-2222-2222-222222222222',
  date_trunc('month', now())::date, 12000, 3400, 2, 350.00
) on conflict (workspace_id, month) do nothing;
