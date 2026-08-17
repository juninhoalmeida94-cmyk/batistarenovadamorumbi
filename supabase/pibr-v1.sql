-- PIBR Morumbi — Sistema V1
-- Execute este arquivo no SQL Editor do Supabase.
-- A V1 permite acesso CRUD somente a usuários autenticados.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  joined_at date,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  first_visit date,
  status text not null default 'pending' check (status in ('pending','followup','confirmed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.cells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader text,
  phone text,
  meeting_day text,
  meeting_time time,
  members_count integer not null default 0 check (members_count >= 0),
  address text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  description text,
  status text not null default 'planned' check (status in ('planned','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  request text not null,
  status text not null default 'pending' check (status in ('pending','followup','answered')),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

-- Perfil básico para evolução futura de permissões.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text not null default 'admin' check (role in ('admin','pastor','leader','ministry')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.members enable row level security;
alter table public.visitors enable row level security;
alter table public.cells enable row level security;
alter table public.events enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.profiles enable row level security;

-- Remover políticas antigas com os mesmos nomes caso o script seja executado novamente.
drop policy if exists "authenticated members" on public.members;
drop policy if exists "authenticated visitors" on public.visitors;
drop policy if exists "authenticated cells" on public.cells;
drop policy if exists "authenticated events" on public.events;
drop policy if exists "authenticated prayers" on public.prayer_requests;
drop policy if exists "own profile read" on public.profiles;

create policy "authenticated members" on public.members
for all to authenticated using (true) with check (true);

create policy "authenticated visitors" on public.visitors
for all to authenticated using (true) with check (true);

create policy "authenticated cells" on public.cells
for all to authenticated using (true) with check (true);

create policy "authenticated events" on public.events
for all to authenticated using (true) with check (true);

create policy "authenticated prayers" on public.prayer_requests
for all to authenticated using (true) with check (true);

create policy "own profile read" on public.profiles
for select to authenticated using (auth.uid() = id);

create index if not exists idx_members_name on public.members (name);
create index if not exists idx_visitors_first_visit on public.visitors (first_visit desc);
create index if not exists idx_events_event_date on public.events (event_date);
create index if not exists idx_prayer_requests_created_at on public.prayer_requests (created_at desc);
