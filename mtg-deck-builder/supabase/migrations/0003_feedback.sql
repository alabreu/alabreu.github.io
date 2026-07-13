-- User-submitted bug reports and feature suggestions. Insert-only from the
-- client (anonymous or logged in, tagged with user_id when available) — no
-- SELECT/UPDATE/DELETE policies, so nobody can read or alter feedback except
-- the service role via the dashboard SQL editor. Deliberately allows
-- anonymous submissions: requiring login would make it impossible to report
-- a bug in the login flow itself.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('bug', 'feature')),
  message text not null,
  contact_email text,
  page_context text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (user_id is null or auth.uid() = user_id);
