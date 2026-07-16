-- Telemetry + admin support (monetization prep — free data-collection window).

-- 1) Per-message Coach telemetry, for the pricing study. Counting messages
-- alone isn't enough to estimate cost (a message on a free model costs $0; one
-- on gpt-4o-mini costs real money), so log the model and token usage per
-- completed message. Written by the coach-proxy edge function after each stream
-- finishes; service-role only (RLS on, no client policies).
create table if not exists public.coach_message_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  created_at timestamptz not null default now(),
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  -- Actual cost reported by OpenRouter (when available), stored in micro-USD
  -- (integer) to avoid floating-point drift. Null when the model is free or
  -- usage/cost wasn't reported.
  cost_micro_usd integer
);
alter table public.coach_message_log enable row level security;
create index if not exists coach_message_log_created_idx on public.coach_message_log (created_at);
create index if not exists coach_message_log_user_idx on public.coach_message_log (user_id, created_at);

-- 2) Admin allowlist for the private metrics dashboard. Populate by inserting
-- your own auth user id:  insert into public.admins (user_id) values ('<uuid>');
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
-- A user may read ONLY their own admin row, so the client can decide whether to
-- show the dashboard entry. It reveals nothing about other users.
create policy "read own admin row" on public.admins for select using (auth.uid() = user_id);

-- 3) Aggregated metrics for the private admin dashboard. SECURITY DEFINER so it
-- can read across all users' data (auth.users, decks, telemetry) — but it
-- self-gates on the admins allowlist, so a non-admin calling it via rpc gets an
-- error, not data. Returns one JSON blob the dashboard renders directly.
create or replace function public.admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'decks', (select count(*) from public.decks),
      'coach_messages', (select count(*) from public.coach_message_log),
      'coach_messages_today', (select count(*) from public.coach_message_log
        where created_at >= date_trunc('day', now())),
      'cost_micro_usd_30d', (select coalesce(sum(cost_micro_usd), 0) from public.coach_message_log
        where created_at >= now() - interval '30 days')
    ),
    'active_users', jsonb_build_object(
      'dau', (select count(distinct user_id) from public.coach_message_log where created_at >= now() - interval '1 day'),
      'wau', (select count(distinct user_id) from public.coach_message_log where created_at >= now() - interval '7 days'),
      'mau', (select count(distinct user_id) from public.coach_message_log where created_at >= now() - interval '30 days')
    ),
    'new_users_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (select date_trunc('day', created_at)::date as d, count(*) as c
            from auth.users where created_at >= now() - interval '30 days' group by 1) t
    ),
    'decks_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (select to_timestamp((data->>'createdAt')::bigint / 1000)::date as d, count(*) as c
            from public.decks where (data->>'createdAt') ~ '^[0-9]+$'
              and to_timestamp((data->>'createdAt')::bigint / 1000) >= now() - interval '30 days'
            group by 1) t
    ),
    'messages_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c, 'cost_micro', cost) order by d), '[]'::jsonb)
      from (select date_trunc('day', created_at)::date as d, count(*) as c, coalesce(sum(cost_micro_usd), 0) as cost
            from public.coach_message_log where created_at >= now() - interval '30 days' group by 1) t
    ),
    'model_mix', (
      select coalesce(jsonb_agg(jsonb_build_object('model', model, 'count', c) order by c desc), '[]'::jsonb)
      from (select model, count(*) as c from public.coach_message_log
            where created_at >= now() - interval '30 days' group by 1) t
    ),
    'feedback', (
      select coalesce(jsonb_agg(jsonb_build_object('type', type, 'count', c)), '[]'::jsonb)
      from (select type, count(*) as c from public.feedback group by 1) t
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_metrics() from public, anon;
grant execute on function public.admin_metrics() to authenticated;
