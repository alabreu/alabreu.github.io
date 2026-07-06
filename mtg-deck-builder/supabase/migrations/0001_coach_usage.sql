-- Tracks daily Coach message counts per user, used by the coach-proxy Edge
-- Function to enforce a per-user daily limit (keeps the embedded OpenRouter
-- key's cost bounded). Only the service role touches this table — RLS is
-- enabled with no policies, so it denies all access from client-side code
-- (anon key / user JWTs), which never query this table directly.
create table if not exists public.coach_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.coach_usage enable row level security;
