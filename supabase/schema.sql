-- Kuromi Rewards: run this entire file in Supabase SQL Editor.
-- Public users can read the points, reward name, and activity log.
-- Only authenticated users with app_metadata.role = 'admin' can change data.

create table if not exists public.rewards_state (
  id integer primary key check (id = 1),
  points integer not null default 0 check (points between 0 and 30),
  reward_name text not null default '神秘專屬獎勵',
  redeemed_count integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.rewards_state (id) values (1) on conflict (id) do nothing;

create table if not exists public.point_events (
  id bigint generated always as identity primary key,
  action text not null,
  delta integer not null default 0,
  points_after integer not null check (points_after between 0 and 30),
  created_at timestamptz not null default now()
);

alter table public.rewards_state enable row level security;
alter table public.point_events enable row level security;

drop policy if exists "Public can view rewards state" on public.rewards_state;
create policy "Public can view rewards state" on public.rewards_state
  for select to anon, authenticated using (true);

drop policy if exists "Public can view point events" on public.point_events;
create policy "Public can view point events" on public.point_events
  for select to anon, authenticated using (true);

revoke all on public.rewards_state from anon, authenticated;
revoke all on public.point_events from anon, authenticated;
grant select on public.rewards_state to anon, authenticated;
grant select on public.point_events to anon, authenticated;

create or replace function public.is_rewards_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.adjust_points(amount integer)
returns void
language plpgsql security definer
set search_path = public
as $$
declare new_points integer;
begin
  if not public.is_rewards_admin() then raise exception 'admin only'; end if;
  if amount not in (-1, 1) then raise exception 'amount must be -1 or 1'; end if;
  update public.rewards_state
    set points = greatest(0, least(30, points + amount)), updated_at = now()
    where id = 1 returning points into new_points;
  insert into public.point_events(action, delta, points_after)
    values (case when amount > 0 then '管理員增加 1 點' else '管理員扣除 1 點' end, amount, new_points);
end;
$$;

create or replace function public.redeem_reward()
returns void
language plpgsql security definer
set search_path = public
as $$
declare current_points integer;
begin
  if not public.is_rewards_admin() then raise exception 'admin only'; end if;
  select points into current_points from public.rewards_state where id = 1 for update;
  if current_points <> 30 then raise exception '需要集滿 30 點才能兌換'; end if;
  update public.rewards_state set points = 0, redeemed_count = redeemed_count + 1, updated_at = now() where id = 1;
  insert into public.point_events(action, delta, points_after) values ('兌換獎勵', -30, 0);
end;
$$;

create or replace function public.update_reward(new_reward text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare current_points integer;
begin
  if not public.is_rewards_admin() then raise exception 'admin only'; end if;
  if length(trim(new_reward)) = 0 or length(new_reward) > 80 then raise exception '獎勵名稱需為 1 至 80 字'; end if;
  update public.rewards_state set reward_name = trim(new_reward), updated_at = now() where id = 1 returning points into current_points;
  insert into public.point_events(action, delta, points_after) values ('更新獎勵名稱', 0, current_points);
end;
$$;

revoke all on function public.adjust_points(integer) from public;
revoke all on function public.redeem_reward() from public;
revoke all on function public.update_reward(text) from public;
grant execute on function public.adjust_points(integer) to authenticated;
grant execute on function public.redeem_reward() to authenticated;
grant execute on function public.update_reward(text) to authenticated;

-- Enable Realtime updates for these tables in Supabase Dashboard if not already enabled:
-- Database > Publications > supabase_realtime > add rewards_state and point_events.
