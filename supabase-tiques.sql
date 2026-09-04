-- Confirmações de entrega e leitura do IL Chats.
-- Seguro para executar novamente: não remove nem altera mensagens existentes.

alter table public.messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

create or replace function public.mark_messages_delivered(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  ) then
    raise exception 'Acesso negado';
  end if;

  update public.messages
     set delivered_at = coalesce(delivered_at, now())
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and delivered_at is null;
end;
$$;

create or replace function public.mark_messages_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  ) then
    raise exception 'Acesso negado';
  end if;

  update public.messages
     set delivered_at = coalesce(delivered_at, now()),
         read_at = coalesce(read_at, now())
   where conversation_id = p_conversation_id
     and sender_id <> auth.uid()
     and read_at is null;
end;
$$;

revoke all on function public.mark_messages_delivered(uuid) from public;
revoke all on function public.mark_messages_read(uuid) from public;
grant execute on function public.mark_messages_delivered(uuid) to authenticated;
grant execute on function public.mark_messages_read(uuid) to authenticated;
