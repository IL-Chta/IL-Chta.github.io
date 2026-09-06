create or replace function public.accept_contact_link(p_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'Entre na sua conta para adicionar o contato.';
  end if;

  select id
    into target_user_id
    from public.profiles
   where lower(username) = lower(trim(leading '@' from trim(p_username)))
   limit 1;

  if target_user_id is null then
    raise exception 'Contato não encontrado.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'Este link pertence à sua própria conta.';
  end if;

  update public.friendships
     set status = 'accepted', updated_at = now()
   where (requester_id = current_user_id and addressee_id = target_user_id)
      or (requester_id = target_user_id and addressee_id = current_user_id);

  if not found then
    insert into public.friendships (requester_id, addressee_id, status)
    values (current_user_id, target_user_id, 'accepted');
  end if;

  return target_user_id;
end;
$$;

revoke all on function public.accept_contact_link(text) from public;
grant execute on function public.accept_contact_link(text) to authenticated;
