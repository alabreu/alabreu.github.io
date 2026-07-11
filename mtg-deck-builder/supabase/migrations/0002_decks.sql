-- Cloud storage for decks, keyed by the same id already used locally
-- (localStorage). `data` holds the full Deck object as-is, so the schema
-- doesn't need to be reshaped every time the Deck type changes on the
-- client. RLS restricts every operation to the row's own owner.
create table if not exists public.decks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists decks_user_id_idx on public.decks(user_id);

alter table public.decks enable row level security;

create policy "Users can view own decks"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "Users can insert own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own decks"
  on public.decks for update
  using (auth.uid() = user_id);

create policy "Users can delete own decks"
  on public.decks for delete
  using (auth.uid() = user_id);
