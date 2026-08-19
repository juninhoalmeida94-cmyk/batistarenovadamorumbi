-- PIBR Morumbi — V3.4 Atualização 03 — Ministérios Administrativos
-- Esta migration JÁ FOI APLICADA no Supabase conectado em 18/08/2026.
-- Mantida para versionamento e recuperação.

alter table public.pibr_ministries
  add column if not exists leader_member_id uuid references public.pibr_members(id) on delete set null,
  add column if not exists vice_leader_member_id uuid references public.pibr_members(id) on delete set null,
  add column if not exists started_at date,
  add column if not exists meeting_weekday smallint check (meeting_weekday is null or meeting_weekday between 0 and 6),
  add column if not exists meeting_time time,
  add column if not exists internal_notes text;

create table if not exists public.pibr_ministry_members (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.pibr_ministries(id) on delete cascade,
  member_id uuid not null references public.pibr_members(id) on delete cascade,
  role_name text,
  status text not null default 'active' check (status in ('active','inactive')),
  joined_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ministry_id, member_id)
);

create table if not exists public.pibr_ministry_groups (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.pibr_ministries(id) on delete cascade,
  name text not null,
  description text,
  leader_member_id uuid references public.pibr_members(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ministry_id, name)
);

create table if not exists public.pibr_ministry_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.pibr_ministry_groups(id) on delete cascade,
  member_id uuid not null references public.pibr_members(id) on delete cascade,
  role_name text,
  created_at timestamptz not null default now(),
  unique(group_id, member_id)
);

alter table public.pibr_media_items
  add column if not exists ministry_id uuid references public.pibr_ministries(id) on delete set null,
  add column if not exists cell_id uuid references public.pibr_cells(id) on delete set null,
  add column if not exists media_category text check (media_category is null or media_category in ('culto','evento','celula','ministerio','geral'));

create index if not exists idx_pibr_ministries_leader_member on public.pibr_ministries(leader_member_id);
create index if not exists idx_pibr_ministry_members_ministry on public.pibr_ministry_members(ministry_id);
create index if not exists idx_pibr_ministry_members_member on public.pibr_ministry_members(member_id);
create index if not exists idx_pibr_ministry_groups_ministry on public.pibr_ministry_groups(ministry_id);
create index if not exists idx_pibr_ministry_group_members_group on public.pibr_ministry_group_members(group_id);
create index if not exists idx_pibr_media_items_ministry on public.pibr_media_items(ministry_id);
create index if not exists idx_pibr_media_items_cell on public.pibr_media_items(cell_id);

create or replace function public.pibr_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_pibr_ministry_members_updated_at on public.pibr_ministry_members;
create trigger trg_pibr_ministry_members_updated_at before update on public.pibr_ministry_members
for each row execute function public.pibr_set_updated_at();

drop trigger if exists trg_pibr_ministry_groups_updated_at on public.pibr_ministry_groups;
create trigger trg_pibr_ministry_groups_updated_at before update on public.pibr_ministry_groups
for each row execute function public.pibr_set_updated_at();

alter table public.pibr_ministry_members enable row level security;
alter table public.pibr_ministry_groups enable row level security;
alter table public.pibr_ministry_group_members enable row level security;

drop policy if exists pibr_ministry_members_admin_read on public.pibr_ministry_members;
drop policy if exists pibr_ministry_members_admin_insert on public.pibr_ministry_members;
drop policy if exists pibr_ministry_members_admin_update on public.pibr_ministry_members;
drop policy if exists pibr_ministry_members_admin_delete on public.pibr_ministry_members;
create policy pibr_ministry_members_admin_read on public.pibr_ministry_members for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_ministry_members_admin_insert on public.pibr_ministry_members for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_ministry_members_admin_update on public.pibr_ministry_members for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_ministry_members_admin_delete on public.pibr_ministry_members for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_ministry_groups_admin_read on public.pibr_ministry_groups;
drop policy if exists pibr_ministry_groups_admin_insert on public.pibr_ministry_groups;
drop policy if exists pibr_ministry_groups_admin_update on public.pibr_ministry_groups;
drop policy if exists pibr_ministry_groups_admin_delete on public.pibr_ministry_groups;
create policy pibr_ministry_groups_admin_read on public.pibr_ministry_groups for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_ministry_groups_admin_insert on public.pibr_ministry_groups for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_ministry_groups_admin_update on public.pibr_ministry_groups for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_ministry_groups_admin_delete on public.pibr_ministry_groups for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_ministry_group_members_admin_read on public.pibr_ministry_group_members;
drop policy if exists pibr_ministry_group_members_admin_insert on public.pibr_ministry_group_members;
drop policy if exists pibr_ministry_group_members_admin_update on public.pibr_ministry_group_members;
drop policy if exists pibr_ministry_group_members_admin_delete on public.pibr_ministry_group_members;
create policy pibr_ministry_group_members_admin_read on public.pibr_ministry_group_members for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_ministry_group_members_admin_insert on public.pibr_ministry_group_members for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_ministry_group_members_admin_update on public.pibr_ministry_group_members for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_ministry_group_members_admin_delete on public.pibr_ministry_group_members for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_media_authenticated_read on public.pibr_media_items;
create policy pibr_media_authenticated_read on public.pibr_media_items
for select to authenticated
using ((status = 'published'::pibr_content_status) or app_private.pibr_is_media() or app_private.pibr_is_admin());
