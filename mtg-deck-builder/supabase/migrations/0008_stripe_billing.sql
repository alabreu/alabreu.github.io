-- Stripe billing: maps Supabase users to Stripe customers and mirrors the
-- current subscription state so the app can gate features on entitlement.
--
-- Security model (mirrors decks/coach tables): RLS lets a user READ only their
-- own rows, and there are deliberately NO insert/update/delete policies — every
-- write comes from the `stripe-webhook` Edge Function using the service role
-- key, which bypasses RLS. A malicious client therefore can never mark itself
-- "active"; entitlement is only ever written server-side from a verified
-- Stripe webhook event.

-- One Stripe customer per Supabase user. Created lazily on first checkout.
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

-- Latest known state of each subscription, keyed by the Stripe subscription id.
-- `status` follows Stripe's values: trialing, active, past_due, canceled,
-- unpaid, incomplete, incomplete_expired, paused.
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;

-- Read-only for the owner; writes are service-role only (no write policies).
create policy "Users can view own stripe customer"
  on public.stripe_customers for select
  using (auth.uid() = user_id);

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);
