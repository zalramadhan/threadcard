-- ThreadCard schema for Supabase.
-- Run once in the Supabase SQL editor, or with `npm run db:migrate`.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  whatsapp text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'free' check (plan in ('free', 'lifetime')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at bigint not null,
  activated_at bigint,
  activated_by uuid,
  email_verified_at bigint
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  note text not null default '',
  created_at bigint not null,
  confirmed_at bigint,
  confirmed_by uuid
);

create table if not exists public.projects (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('video', 'audio', 'image')),
  name text not null default '',
  mime text not null default '',
  ext text not null default '',
  size bigint not null default 0,
  duration double precision,
  storage_path text not null,
  pinned_by uuid,
  created_at bigint not null
);

create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at bigint not null,
  updated_by uuid
);

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_id text not null default '',
  detail text not null default '',
  created_at bigint not null
);

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at bigint not null
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists media_owner_idx on public.media (owner_id, created_at desc);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
create index if not exists rate_limits_reset_idx on public.rate_limits (reset_at);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.projects enable row level security;
alter table public.media enable row level security;
alter table public.settings enable row level security;
alter table public.admin_audit enable row level security;
alter table public.rate_limits enable row level security;

-- Every request goes through the service role on the server, so no client
-- policies are granted. The anon key is only used for Supabase Auth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, whatsapp, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    (extract(epoch from clock_timestamp()) * 1000)::bigint
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Atomically counts an attempt and returns the retry-after seconds when the
-- caller is over the limit (0 means the request may proceed).
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms bigint
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_count integer;
  v_reset bigint;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + p_window_ms)
  on conflict (key) do update set
    count = case when public.rate_limits.reset_at <= v_now then 1 else public.rate_limits.count + 1 end,
    reset_at = case when public.rate_limits.reset_at <= v_now then v_now + p_window_ms else public.rate_limits.reset_at end
  returning count, reset_at into v_count, v_reset;

  if v_count > p_limit then
    return greatest(1, ceil((v_reset - v_now) / 1000.0)::integer);
  end if;
  return 0;
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
select jsonb_build_object(
  'users', (select count(*) from public.profiles),
  'lifetime', (select count(*) from public.profiles where plan = 'lifetime'),
  'free', (select count(*) from public.profiles where plan = 'free'),
  'suspended', (select count(*) from public.profiles where status = 'suspended'),
  'unverified', (select count(*) from public.profiles where email_verified_at is null),
  'pendingOrders', (select count(*) from public.orders where status = 'pending'),
  'paidOrders', (select count(*) from public.orders where status = 'paid'),
  'cancelledOrders', (select count(*) from public.orders where status = 'cancelled'),
  'revenue', (select coalesce(sum(amount), 0) from public.orders where status = 'paid'),
  'projects', (select count(*) from public.projects)
);
$$;

create or replace function public.admin_users()
returns table (
  id uuid,
  email text,
  name text,
  whatsapp text,
  role text,
  plan text,
  status text,
  created_at bigint,
  activated_at bigint,
  email_verified_at bigint,
  pending_code text,
  pending_created_at bigint,
  project_updated_at bigint
)
language sql
security definer
set search_path = public
as $$
select
  p.id,
  p.email,
  p.name,
  p.whatsapp,
  p.role,
  p.plan,
  p.status,
  p.created_at,
  p.activated_at,
  p.email_verified_at,
  o.code,
  o.created_at,
  pr.updated_at
from public.profiles p
left join lateral (
  select code, created_at from public.orders
  where user_id = p.id and status = 'pending'
  order by created_at desc limit 1
) o on true
left join public.projects pr on pr.user_id = p.id
order by p.created_at desc
limit 500;
$$;

create or replace function public.storage_usage()
returns jsonb
language sql
security definer
set search_path = public
as $$
select jsonb_build_object(
  'uploadsBytes', (select coalesce(sum(size), 0) from public.media),
  'uploadsFiles', (select count(*) from public.media)
);
$$;

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
