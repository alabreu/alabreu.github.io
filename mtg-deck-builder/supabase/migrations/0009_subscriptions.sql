-- Subscriptions: mirrors each user's real subscription state in Stripe. Written
-- ONLY by the stripe-webhook Edge Function (service role, which bypasses RLS);
-- the client may read its own row to unlock paid features. Charging is not live
-- yet — this is infra so the switch is a config change, not a code change.
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'inactive',
  price_id               text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read their own subscription. There is deliberately no INSERT/UPDATE/
-- DELETE policy: only the service role (webhook) mutates this table.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
