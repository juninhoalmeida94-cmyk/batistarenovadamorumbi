-- PIBR Morumbi — V3.4 Atualização 04 — Células Administrativas
-- Esta migration JÁ FOI APLICADA no Supabase conectado em 18/08/2026.
-- Mantida para versionamento e recuperação.

alter table public.pibr_cells
  add column if not exists leader_member_id uuid references public.pibr_members(id) on delete set null,
  add column if not exists vice_leader_member_id uuid references public.pibr_members(id) on delete set null,
  add column if not exists host_member_id uuid references public.pibr_members(id) on delete set null,
  add column if not exists started_at date,
  add column if not exists internal_weekday smallint check (internal_weekday is null or internal_weekday between 0 and 6),
  add column if not exists internal_meeting_time time,
  add column if not exists internal_address text,
  add column if not exists internal_neighborhood text,
  add column if not exists internal_city text,
  add column if not exists internal_state text,
  add column if not exists max_people integer check (max_people is null or max_people >= 0),
  add column if not exists internal_notes text,
  add column if not exists internal_status text not null default 'active'
    check (internal_status in ('active','paused','closed'));

create table if not exists public.pibr_cell_members (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.pibr_cells(id) on delete cascade,
  member_id uuid not null references public.pibr_members(id) on delete cascade,
  role_name text,
  status text not null default 'active' check (status in ('active','inactive')),
  joined_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cell_id, member_id)
);

create table if not exists public.pibr_cell_meetings (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.pibr_cells(id) on delete cascade,
  meeting_date date not null,
  attendees_count integer not null default 0 check (attendees_count >= 0),
  visitors_count integer not null default 0 check (visitors_count >= 0),
  decisions_count integer not null default 0 check (decisions_count >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cell_id, meeting_date)
);

create index if not exists idx_pibr_cell_members_cell on public.pibr_cell_members(cell_id);
create index if not exists idx_pibr_cell_members_member on public.pibr_cell_members(member_id);
create index if not exists idx_pibr_cell_meetings_cell_date on public.pibr_cell_meetings(cell_id, meeting_date desc);
create index if not exists idx_pibr_cells_leader_member on public.pibr_cells(leader_member_id);

create or replace function public.pibr_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_pibr_cell_members_updated_at on public.pibr_cell_members;
create trigger trg_pibr_cell_members_updated_at before update on public.pibr_cell_members
for each row execute function public.pibr_set_updated_at();

drop trigger if exists trg_pibr_cell_meetings_updated_at on public.pibr_cell_meetings;
create trigger trg_pibr_cell_meetings_updated_at before update on public.pibr_cell_meetings
for each row execute function public.pibr_set_updated_at();

alter table public.pibr_cell_members enable row level security;
alter table public.pibr_cell_meetings enable row level security;

drop policy if exists pibr_cell_members_admin_read on public.pibr_cell_members;
drop policy if exists pibr_cell_members_admin_insert on public.pibr_cell_members;
drop policy if exists pibr_cell_members_admin_update on public.pibr_cell_members;
drop policy if exists pibr_cell_members_admin_delete on public.pibr_cell_members;
create policy pibr_cell_members_admin_read on public.pibr_cell_members for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_cell_members_admin_insert on public.pibr_cell_members for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_cell_members_admin_update on public.pibr_cell_members for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_cell_members_admin_delete on public.pibr_cell_members for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_cell_meetings_admin_read on public.pibr_cell_meetings;
drop policy if exists pibr_cell_meetings_admin_insert on public.pibr_cell_meetings;
drop policy if exists pibr_cell_meetings_admin_update on public.pibr_cell_meetings;
drop policy if exists pibr_cell_meetings_admin_delete on public.pibr_cell_meetings;
create policy pibr_cell_meetings_admin_read on public.pibr_cell_meetings for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_cell_meetings_admin_insert on public.pibr_cell_meetings for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_cell_meetings_admin_update on public.pibr_cell_meetings for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_cell_meetings_admin_delete on public.pibr_cell_meetings for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_media_authenticated_read on public.pibr_media_items;
create policy pibr_media_authenticated_read on public.pibr_media_items
for select to authenticated
using ((status = 'published'::pibr_content_status) or app_private.pibr_is_media() or app_private.pibr_is_admin());
