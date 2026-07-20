-- Records explicit acceptance of the Terms/Privacy, with the version accepted,
-- for auditability (LGPD). One row per user per version. Written by the client
-- right after login/signup (RLS lets a user insert/read only their own rows).
create table if not exists public.terms_acceptance (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.terms_acceptance enable row level security;

drop policy if exists "insert own acceptance" on public.terms_acceptance;
create policy "insert own acceptance" on public.terms_acceptance
  for insert with check (auth.uid() = user_id);

drop policy if exists "read own acceptance" on public.terms_acceptance;
create policy "read own acceptance" on public.terms_acceptance
  for select using (auth.uid() = user_id);
