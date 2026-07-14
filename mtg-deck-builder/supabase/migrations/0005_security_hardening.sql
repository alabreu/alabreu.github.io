-- Security hardening (item 10 review).

-- 1) Global daily cap across ALL users for the coach-proxy. The per-user limit
-- (add_coach_usage) alone doesn't bound aggregate cost: signup is self-serve
-- (magic link), so an attacker can create N throwaway accounts and spend N×40
-- messages/day on the *paid* model. This is a backstop keyed only by day, so
-- the operator's OpenRouter spend has a hard daily ceiling regardless of how
-- many accounts exist. (Set GLOBAL_DAILY_LIMIT in the edge function to taste.)
create table if not exists public.coach_usage_global (
  day date primary key,
  count integer not null default 0
);
alter table public.coach_usage_global enable row level security;
-- No policies: RLS-on + no policy = deny all client access; only the service
-- role (which bypasses RLS) touches it, same pattern as coach_usage.

create or replace function public.add_global_coach_usage(p_day date, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.coach_usage_global (day, count)
  values (p_day, greatest(0, p_delta))
  on conflict (day)
  do update set count = greatest(0, public.coach_usage_global.count + p_delta)
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.add_global_coach_usage(date, integer) from public, anon, authenticated;

-- 2) Size caps on the feedback table. INSERT is intentionally open to anon (so
-- a bug in the login flow can still be reported), but the fields were unbounded
-- text with no rate limit — anyone with the public anon key could loop inserts
-- of multi-MB rows and exhaust the project's storage. Bound each field.
-- (Added NOT VALID so this never fails on a pre-existing oversized row; new
-- rows are still checked. Run `alter table ... validate constraint ...` later
-- if you want to enforce it retroactively.)
alter table public.feedback
  add constraint feedback_message_len check (char_length(message) <= 4000) not valid;
alter table public.feedback
  add constraint feedback_email_len check (contact_email is null or char_length(contact_email) <= 320) not valid;
alter table public.feedback
  add constraint feedback_context_len check (page_context is null or char_length(page_context) <= 500) not valid;
