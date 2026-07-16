-- Admin-controlled app settings, starting with the Tutor's active LLM model.
-- The end user no longer chooses the model — it's a product decision made from
-- the admin dashboard. The coach-proxy edge function reads active_model from
-- here (service role) and forwards requests to it, ignoring any client-sent
-- model, so only an admin can change which model everyone runs on.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.app_settings enable row level security;

-- Authenticated users may READ settings (the active model id isn't sensitive;
-- the client uses it for display / the future BYOK path). No client WRITE
-- policy — writes go only through the admin-gated function below. Keep secrets
-- OUT of this table (readable by any logged-in user); it's for product config.
drop policy if exists "read app settings" on public.app_settings;
create policy "read app settings" on public.app_settings
  for select using (auth.uid() is not null);

-- Seed the default active model (the current paid default). Won't clobber an
-- existing value on re-run.
insert into public.app_settings (key, value)
  values ('active_model', '"openai/gpt-4o-mini"'::jsonb)
  on conflict (key) do nothing;

-- Admin-only setter for the active model. SECURITY DEFINER so it can write the
-- table (no client write policy), but self-gates on the admins allowlist.
create or replace function public.admin_set_active_model(p_model text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_model is null or length(p_model) < 3 or length(p_model) > 100 then
    raise exception 'invalid model';
  end if;
  insert into public.app_settings (key, value, updated_at, updated_by)
    values ('active_model', to_jsonb(p_model), now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  return jsonb_build_object('active_model', p_model);
end;
$$;

revoke all on function public.admin_set_active_model(text) from public, anon;
grant execute on function public.admin_set_active_model(text) to authenticated;
