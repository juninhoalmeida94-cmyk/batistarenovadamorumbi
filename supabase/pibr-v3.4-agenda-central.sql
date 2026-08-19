-- PIBR Morumbi — V3.4 Atualização 02 — Agenda Central
-- Esta migration JÁ FOI APLICADA no Supabase conectado em 18/08/2026.
-- Arquivo mantido para versionamento/backup.

create table if not exists public.pibr_fixed_services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  weekday smallint not null check (weekday between 0 and 6),
  meeting_time time not null,
  location text,
  description text,
  color_key text not null default 'service',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pibr_fixed_service_variations (
  id uuid primary key default gen_random_uuid(),
  fixed_service_id uuid not null references public.pibr_fixed_services(id) on delete cascade,
  week_of_month smallint not null check (week_of_month between 1 and 5),
  special_title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fixed_service_id, week_of_month)
);

create table if not exists public.pibr_ministry_scales (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid references public.pibr_ministries(id) on delete set null,
  fixed_service_id uuid references public.pibr_fixed_services(id) on delete set null,
  event_id uuid references public.pibr_events(id) on delete set null,
  title text not null,
  scale_date date not null,
  start_time time,
  group_name text,
  notes text,
  status text not null default 'draft' check (status in ('draft','published','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pibr_ministry_scale_members (
  id uuid primary key default gen_random_uuid(),
  scale_id uuid not null references public.pibr_ministry_scales(id) on delete cascade,
  member_id uuid not null references public.pibr_members(id) on delete cascade,
  role_name text,
  created_at timestamptz not null default now(),
  unique(scale_id, member_id, role_name)
);

create index if not exists idx_pibr_fixed_services_weekday on public.pibr_fixed_services (weekday, meeting_time);
create index if not exists idx_pibr_scales_date on public.pibr_ministry_scales (scale_date, start_time);
create index if not exists idx_pibr_scales_ministry on public.pibr_ministry_scales (ministry_id);
create index if not exists idx_pibr_scale_members_scale on public.pibr_ministry_scale_members (scale_id);

create or replace function public.pibr_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_pibr_fixed_services_updated_at on public.pibr_fixed_services;
create trigger trg_pibr_fixed_services_updated_at before update on public.pibr_fixed_services
for each row execute function public.pibr_set_updated_at();

drop trigger if exists trg_pibr_fixed_service_variations_updated_at on public.pibr_fixed_service_variations;
create trigger trg_pibr_fixed_service_variations_updated_at before update on public.pibr_fixed_service_variations
for each row execute function public.pibr_set_updated_at();

drop trigger if exists trg_pibr_ministry_scales_updated_at on public.pibr_ministry_scales;
create trigger trg_pibr_ministry_scales_updated_at before update on public.pibr_ministry_scales
for each row execute function public.pibr_set_updated_at();

alter table public.pibr_fixed_services enable row level security;
alter table public.pibr_fixed_service_variations enable row level security;
alter table public.pibr_ministry_scales enable row level security;
alter table public.pibr_ministry_scale_members enable row level security;

drop policy if exists pibr_fixed_services_admin_read on public.pibr_fixed_services;
drop policy if exists pibr_fixed_services_admin_insert on public.pibr_fixed_services;
drop policy if exists pibr_fixed_services_admin_update on public.pibr_fixed_services;
drop policy if exists pibr_fixed_services_admin_delete on public.pibr_fixed_services;
create policy pibr_fixed_services_admin_read on public.pibr_fixed_services for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_fixed_services_admin_insert on public.pibr_fixed_services for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_fixed_services_admin_update on public.pibr_fixed_services for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_fixed_services_admin_delete on public.pibr_fixed_services for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_fixed_variations_admin_read on public.pibr_fixed_service_variations;
drop policy if exists pibr_fixed_variations_admin_insert on public.pibr_fixed_service_variations;
drop policy if exists pibr_fixed_variations_admin_update on public.pibr_fixed_service_variations;
drop policy if exists pibr_fixed_variations_admin_delete on public.pibr_fixed_service_variations;
create policy pibr_fixed_variations_admin_read on public.pibr_fixed_service_variations for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_fixed_variations_admin_insert on public.pibr_fixed_service_variations for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_fixed_variations_admin_update on public.pibr_fixed_service_variations for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_fixed_variations_admin_delete on public.pibr_fixed_service_variations for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_scales_admin_read on public.pibr_ministry_scales;
drop policy if exists pibr_scales_admin_insert on public.pibr_ministry_scales;
drop policy if exists pibr_scales_admin_update on public.pibr_ministry_scales;
drop policy if exists pibr_scales_admin_delete on public.pibr_ministry_scales;
create policy pibr_scales_admin_read on public.pibr_ministry_scales for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_scales_admin_insert on public.pibr_ministry_scales for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_scales_admin_update on public.pibr_ministry_scales for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_scales_admin_delete on public.pibr_ministry_scales for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_scale_members_admin_read on public.pibr_ministry_scale_members;
drop policy if exists pibr_scale_members_admin_insert on public.pibr_ministry_scale_members;
drop policy if exists pibr_scale_members_admin_update on public.pibr_ministry_scale_members;
drop policy if exists pibr_scale_members_admin_delete on public.pibr_ministry_scale_members;
create policy pibr_scale_members_admin_read on public.pibr_ministry_scale_members for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_scale_members_admin_insert on public.pibr_ministry_scale_members for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_scale_members_admin_update on public.pibr_ministry_scale_members for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_scale_members_admin_delete on public.pibr_ministry_scale_members for delete to authenticated using (app_private.pibr_is_admin());
