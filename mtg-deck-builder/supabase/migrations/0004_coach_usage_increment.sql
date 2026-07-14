-- Atomic add-to-daily-count for the coach-proxy rate limiter. The previous
-- read-then-upsert (SELECT count, then UPSERT count+1 computed in JS) is not
-- atomic: N concurrent requests all read the same value and all write the same
-- +1, so a user could sail well past the daily cap by firing requests in
-- parallel. This function does the increment in a single statement and returns
-- the resulting count, so the edge function can enforce the limit on a value
-- that reflects all concurrent callers. It also supports a negative delta so a
-- request that fails upstream (or lands over the cap) can be refunded.
--
-- SECURITY DEFINER so it runs as the table owner; only the service role calls
-- it (the edge function), never client code.
create or replace function public.add_coach_usage(p_user_id uuid, p_day date, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.coach_usage (user_id, day, count)
  values (p_user_id, p_day, greatest(0, p_delta))
  on conflict (user_id, day)
  do update set count = greatest(0, public.coach_usage.count + p_delta)
  returning count into new_count;
  return new_count;
end;
$$;

-- Only the service role should be able to call this; revoke the default grants.
revoke all on function public.add_coach_usage(uuid, date, integer) from public, anon, authenticated;
