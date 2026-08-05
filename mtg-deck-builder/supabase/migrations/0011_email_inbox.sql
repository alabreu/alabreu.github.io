-- Support e-mails sent to contato@tutor-brew.com land in the same admin inbox
-- as in-app feedback. Migration 0006 already added feedback.source for exactly
-- this ("In-app feedback and (later) support emails"); this finishes the job.

-- 1) Allow the new kind. The old constraint only knew 'bug' and 'feature'.
alter table public.feedback drop constraint if exists feedback_type_check;
alter table public.feedback
  add constraint feedback_type_check check (type in ('bug', 'feature', 'email'));

-- 2) E-mails have a subject; in-app feedback doesn't. Nullable so nothing else
--    has to change.
alter table public.feedback add column if not exists subject text;

-- 3) Surface it in the dashboard payload.
create or replace function public.admin_feedback(p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  select coalesce(jsonb_agg(t.row order by t.created_at desc), '[]'::jsonb) into result
  from (
    select jsonb_build_object(
      'id', f.id,
      'source', f.source,
      'type', f.type,
      'subject', f.subject,
      'message', f.message,
      'contact_email', f.contact_email,
      'page_context', f.page_context,
      'user_email', u.email,
      'created_at', f.created_at
    ) as row, f.created_at
    from public.feedback f
    left join auth.users u on u.id = f.user_id
    where f.user_id is null or f.user_id not in (select user_id from internal_user_ids)
    order by f.created_at desc
    limit greatest(1, least(p_limit, 200))
    offset greatest(0, p_offset)
  ) t;

  return result;
end;
$$;

revoke all on function public.admin_feedback(integer, integer) from public, anon;
grant execute on function public.admin_feedback(integer, integer) to authenticated;

-- No new RLS policy: the existing insert policy is for the client, and the
-- email-inbox edge function writes with the service role, which bypasses RLS.
