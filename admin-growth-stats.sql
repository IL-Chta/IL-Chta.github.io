create or replace function public.get_admin_growth_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_admins where user_id = auth.uid()
  ) then
    raise exception 'Acesso permitido somente para administradores.';
  end if;

  select jsonb_build_object(
    'accounts', (select count(*) from public.profiles),
    'visits', (select count(*) from public.visit_events),
    'accounts_with_contacts', (
      select count(distinct person_id)
      from (
        select requester_id as person_id from public.friendships where status = 'accepted'
        union
        select addressee_id as person_id from public.friendships where status = 'accepted'
      ) connected_accounts
    ),
    'connected_pairs', (
      select count(*) from public.friendships where status = 'accepted'
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_admin_growth_stats() from public;
grant execute on function public.get_admin_growth_stats() to authenticated;
