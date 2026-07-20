-- One row per completed donation, for metrics. Written only by the
-- stripe-webhook Edge Function (service role) on checkout.session.completed
-- with mode=payment. `user_id` is null for anonymous (logged-out) donors.
--
-- RLS: a logged-in user can read their own donation rows; anonymous rows are
-- visible only to the service role (e.g. the admin dashboard). No client write
-- policies — same rule as the billing tables.
create table if not exists public.donations (
  id text primary key,                        -- Stripe Checkout Session id
  user_id uuid references auth.users(id) on delete set null,
  amount_total integer not null,              -- smallest currency unit (cents)
  currency text not null,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists donations_created_at_idx on public.donations(created_at);

alter table public.donations enable row level security;

create policy "Users can view own donations"
  on public.donations for select
  using (auth.uid() = user_id);
