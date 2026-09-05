create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscription_insert_own" on public.push_subscriptions;
create policy "push_subscription_insert_own" on public.push_subscriptions
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push_subscription_update_own" on public.push_subscriptions;
create policy "push_subscription_update_own" on public.push_subscriptions
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_subscription_delete_own" on public.push_subscriptions;
create policy "push_subscription_delete_own" on public.push_subscriptions
for delete to authenticated using (auth.uid() = user_id);

grant insert, update, delete on public.push_subscriptions to authenticated;
