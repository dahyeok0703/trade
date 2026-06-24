-- ─────────────────────────────────────────────────────────────────────────────
-- AI usage recording + quota (margin protection)
--
-- ai_usage is owner-read-only and has no user INSERT policy (system-written).
-- These SECURITY DEFINER helpers let an active member record usage and read the
-- month's extract count WITHOUT a service-role key — so margin tracking works
-- under graceful degradation. They resolve the caller's workspace from auth.uid().
-- ─────────────────────────────────────────────────────────────────────────────

-- Records one extraction's token usage into the current month's ai_usage row
-- (upsert + increment). Returns the running doc_count for the month.
create or replace function public.record_ai_usage(
  p_input_tokens  bigint,
  p_output_tokens bigint,
  p_doc_count     integer,
  p_est_cost_krw  numeric
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
  cnt integer;
begin
  select m.workspace_id into wid
  from public.members m
  where m.user_id = auth.uid() and m.status = 'active'
  order by m.created_at
  limit 1;

  if wid is null then
    raise exception 'no active workspace for current user';
  end if;

  insert into public.ai_usage (workspace_id, month, input_tokens, output_tokens, doc_count, est_cost_krw)
  values (wid, date_trunc('month', now())::date, p_input_tokens, p_output_tokens, p_doc_count, p_est_cost_krw)
  on conflict (workspace_id, month) do update
    set input_tokens  = public.ai_usage.input_tokens  + excluded.input_tokens,
        output_tokens = public.ai_usage.output_tokens + excluded.output_tokens,
        doc_count     = public.ai_usage.doc_count     + excluded.doc_count,
        est_cost_krw  = public.ai_usage.est_cost_krw  + excluded.est_cost_krw,
        updated_at    = now()
  returning doc_count into cnt;

  return cnt;
end;
$$;

-- Number of extractions the caller's workspace has run this calendar month.
create or replace function public.ai_extract_count_this_month()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select a.doc_count
     from public.ai_usage a
     join public.members m on m.workspace_id = a.workspace_id
     where m.user_id = auth.uid() and m.status = 'active'
       and a.month = date_trunc('month', now())::date
     order by m.created_at
     limit 1),
    0
  );
$$;

revoke all on function public.record_ai_usage(bigint, bigint, integer, numeric) from public, anon;
grant execute on function public.record_ai_usage(bigint, bigint, integer, numeric) to authenticated;
grant execute on function public.ai_extract_count_this_month() to authenticated;
