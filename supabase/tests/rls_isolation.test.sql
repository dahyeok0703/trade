-- ─────────────────────────────────────────────────────────────────────────────
-- RLS isolation test  (run with: supabase test db)
--
-- Verifies that workspaces are isolated and that role restrictions hold:
--   • owners/staff see ONLY their own workspace rows
--   • no cross-workspace read or write is possible
--   • staff cannot touch members / workspace settings / owner-only tables
--   • anon sees nothing
--
-- Self-contained: builds its own users + workspaces, so it does not depend on
-- the demo seed. Everything runs inside one transaction and is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────

begin;
select plan(17);

-- ── Fixtures (created as the privileged test role) ───────────────────────────
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-00000000000a','authenticated','authenticated','ta@test.dev'),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-00000000000b','authenticated','authenticated','tb@test.dev'),
  ('00000000-0000-0000-0000-000000000000','cccccccc-0000-0000-0000-00000000000c','authenticated','authenticated','tc@test.dev');

insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-1111-1111-1111-111111111111','WS X','ws-x'),
  ('bbbbbbbb-1111-1111-1111-111111111111','WS Y','ws-y');

insert into public.members (workspace_id, user_id, role, status) values
  ('aaaaaaaa-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-00000000000a','owner','active'),
  ('bbbbbbbb-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-00000000000b','owner','active'),
  ('aaaaaaaa-1111-1111-1111-111111111111','cccccccc-0000-0000-0000-00000000000c','staff','active');

insert into public.buyers (workspace_id, name_en) values
  ('aaaaaaaa-1111-1111-1111-111111111111','X Buyer'),
  ('bbbbbbbb-1111-1111-1111-111111111111','Y Buyer');

insert into public.products (workspace_id, name_en) values
  ('aaaaaaaa-1111-1111-1111-111111111111','X Product 1'),
  ('aaaaaaaa-1111-1111-1111-111111111111','X Product 2'),
  ('aaaaaaaa-1111-1111-1111-111111111111','X Product 3');

insert into public.ai_usage (workspace_id, month, input_tokens) values
  ('aaaaaaaa-1111-1111-1111-111111111111', date_trunc('month', now())::date, 100);

-- ── helper: become a user ────────────────────────────────────────────────────
-- (set local role + JWT claims, exactly like Supabase's PostgREST.)

-- Scenario 1: owner of WS X sees only WS X ------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*) from public.workspaces)::int, 1, 'owner X sees exactly 1 workspace');
select is((select count(*) from public.buyers)::int, 1, 'owner X sees only its buyer');
select is((select count(*) from public.products)::int, 3, 'owner X sees its 3 products');
select is((select count(*) from public.buyers where name_en = 'Y Buyer')::int, 0, 'owner X cannot see WS Y buyer');

-- Scenario 2: owner of WS Y sees only WS Y ------------------------------------
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.products)::int, 0, 'owner Y sees no products (none in WS Y)');
select is((select count(*) from public.buyers)::int, 1, 'owner Y sees only its buyer');

-- Scenario 3: owner X cannot write into WS Y ----------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';

select throws_ok(
  $$ insert into public.buyers (workspace_id, name_en) values ('bbbbbbbb-1111-1111-1111-111111111111','injected') $$,
  '42501', null, 'owner X cannot INSERT into WS Y'
);
select lives_ok(
  $$ do $b$ declare n int; begin
       update public.buyers set country = 'zz' where name_en = 'Y Buyer';
       get diagnostics n = row_count;
       if n <> 0 then raise exception 'affected % rows', n; end if;
     end $b$ $$,
  'owner X UPDATE of WS Y rows affects 0 rows'
);
select lives_ok(
  $$ do $b$ declare n int; begin
       delete from public.buyers where name_en = 'Y Buyer';
       get diagnostics n = row_count;
       if n <> 0 then raise exception 'affected % rows', n; end if;
     end $b$ $$,
  'owner X DELETE of WS Y rows affects 0 rows'
);

-- Scenario 4: owner X can fully CRUD within WS X ------------------------------
select lives_ok(
  $$
    with i as (
      insert into public.buyers (workspace_id, name_en)
      values ('aaaaaaaa-1111-1111-1111-111111111111','Temp X') returning id
    ), u as (
      update public.buyers set country = 'KR' where id = (select id from i) returning id
    )
    delete from public.buyers where id = (select id from u)
  $$,
  'owner X can INSERT/UPDATE/DELETE within WS X'
);

-- Scenario 5: staff in WS X — operational allowed, sensitive blocked ----------
set local request.jwt.claims to '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*) from public.products)::int, 3, 'staff can read operational data');
select lives_ok(
  $$ insert into public.buyers (workspace_id, name_en) values ('aaaaaaaa-1111-1111-1111-111111111111','Staff Buyer') $$,
  'staff can write operational data'
);
select is((select count(*) from public.ai_usage)::int, 0, 'staff cannot read ai_usage (owner-only)');
select throws_ok(
  $$ insert into public.members (workspace_id, user_id, role) values ('aaaaaaaa-1111-1111-1111-111111111111', gen_random_uuid(), 'staff') $$,
  '42501', null, 'staff cannot add members (owner-only)'
);
select lives_ok(
  $$ do $b$ declare n int; begin
       update public.workspaces set name = 'hacked' where id = 'aaaaaaaa-1111-1111-1111-111111111111';
       get diagnostics n = row_count;
       if n <> 0 then raise exception 'affected % rows', n; end if;
     end $b$ $$,
  'staff cannot update workspace settings (owner-only)'
);

-- Scenario 6: owner X can read owner-only ai_usage ----------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*) from public.ai_usage)::int, 1, 'owner X can read its ai_usage');

-- Scenario 7: anon sees nothing ----------------------------------------------
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from public.workspaces)::int, 0, 'anon sees no workspaces');

reset role;
select * from finish();
rollback;
