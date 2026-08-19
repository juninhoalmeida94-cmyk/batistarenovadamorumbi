-- PIBR Morumbi — V3.4 Membresia Administrativa
-- Esta migration já foi aplicada no projeto Supabase conectado em 18/08/2026.
-- Mantida aqui para versionamento e recuperação.

create table if not exists public.pibr_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  photo_url text,
  email text,
  phone text,
  birth_date date,
  joined_at date,
  category text not null default 'member' check (category in ('new_convert','child','leader','member','non_communicant','visitor','congregant')),
  civil_status text not null default 'not_informed' check (civil_status in ('not_informed','single','married','divorced','widowed','stable_union')),
  role_title text,
  is_minor boolean not null default false,
  guardian_member_id uuid references public.pibr_members(id) on delete set null,
  guardian_name text,
  guardian_phone text,
  postal_code text,
  street text,
  address_number text,
  complement text,
  neighborhood text,
  city text not null default 'Paranavaí',
  state text not null default 'PR',
  cpf text,
  rg text,
  gender text check (gender is null or gender in ('male','female','not_informed')),
  decision_date date,
  baptism_date date,
  membership_date date,
  membership_status text not null default 'active' check (membership_status in ('active','inactive','transferred','deceased')),
  assigned_leader_id uuid references public.pibr_leaders(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pibr_member_ministry_interests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.pibr_members(id) on delete cascade,
  ministry_id uuid not null references public.pibr_ministries(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested','contacted','integrated','declined')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, ministry_id)
);

create index if not exists idx_pibr_members_full_name on public.pibr_members (full_name);
create index if not exists idx_pibr_members_birth_date on public.pibr_members (birth_date);
create index if not exists idx_pibr_members_category on public.pibr_members (category);
create index if not exists idx_pibr_members_status on public.pibr_members (membership_status);
create index if not exists idx_pibr_members_neighborhood on public.pibr_members (neighborhood);
create index if not exists idx_pibr_member_ministry_member on public.pibr_member_ministry_interests (member_id);

create or replace function public.pibr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pibr_members_updated_at on public.pibr_members;
create trigger trg_pibr_members_updated_at before update on public.pibr_members
for each row execute function public.pibr_set_updated_at();

drop trigger if exists trg_pibr_member_ministry_interests_updated_at on public.pibr_member_ministry_interests;
create trigger trg_pibr_member_ministry_interests_updated_at before update on public.pibr_member_ministry_interests
for each row execute function public.pibr_set_updated_at();

alter table public.pibr_members enable row level security;
alter table public.pibr_member_ministry_interests enable row level security;

drop policy if exists pibr_members_admin_read on public.pibr_members;
drop policy if exists pibr_members_admin_insert on public.pibr_members;
drop policy if exists pibr_members_admin_update on public.pibr_members;
drop policy if exists pibr_members_admin_delete on public.pibr_members;

create policy pibr_members_admin_read on public.pibr_members for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_members_admin_insert on public.pibr_members for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_members_admin_update on public.pibr_members for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_members_admin_delete on public.pibr_members for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_member_ministry_admin_read on public.pibr_member_ministry_interests;
drop policy if exists pibr_member_ministry_admin_insert on public.pibr_member_ministry_interests;
drop policy if exists pibr_member_ministry_admin_update on public.pibr_member_ministry_interests;
drop policy if exists pibr_member_ministry_admin_delete on public.pibr_member_ministry_interests;

create policy pibr_member_ministry_admin_read on public.pibr_member_ministry_interests for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_member_ministry_admin_insert on public.pibr_member_ministry_interests for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_member_ministry_admin_update on public.pibr_member_ministry_interests for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_member_ministry_admin_delete on public.pibr_member_ministry_interests for delete to authenticated using (app_private.pibr_is_admin());
