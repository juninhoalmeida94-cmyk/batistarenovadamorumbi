-- PIBR Morumbi — V3.4 Atualização 05 — Acompanhamento
-- Esta migration JÁ FOI APLICADA no Supabase conectado em 18/08/2026.

create table if not exists public.pibr_journey_stages (
  id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
  description text, sort_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

insert into public.pibr_journey_stages (code,title,description,sort_order) values
('first_contact','Primeiro contato','Pessoa recebida pela igreja ou cadastrada para acompanhamento.',10),
('first_visit','Primeira visita','Primeira participação presencial registrada.',20),
('followup','Em acompanhamento','Contato pastoral ou de integração em andamento.',30),
('integrated','Integrado','Pessoa já integrada à convivência da igreja.',40),
('cell','Célula','Pessoa encaminhada ou integrada a uma célula.',50),
('baptism','Batismo','Etapa relacionada ao batismo nas águas.',60),
('discipleship','Discipulado','Pessoa em discipulado ou curso de integração.',70),
('ministry','Ministério','Pessoa integrada a uma área de serviço.',80)
on conflict (code) do update set title=excluded.title,description=excluded.description,sort_order=excluded.sort_order;

create table if not exists public.pibr_person_journeys (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.pibr_members(id) on delete cascade,
  visitor_id uuid references public.pibr_visitors(id) on delete cascade,
  current_stage_id uuid not null references public.pibr_journey_stages(id) on delete restrict,
  assigned_leader_member_id uuid references public.pibr_members(id) on delete set null,
  assigned_cell_id uuid references public.pibr_cells(id) on delete set null,
  next_action text, next_contact_at timestamptz,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  notes text, started_at timestamptz not null default now(), completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint pibr_person_journeys_subject_chk check (
    (member_id is not null and visitor_id is null) or (member_id is null and visitor_id is not null)
  )
);

create unique index if not exists uq_pibr_person_journey_member on public.pibr_person_journeys(member_id) where member_id is not null and status <> 'archived';
create unique index if not exists uq_pibr_person_journey_visitor on public.pibr_person_journeys(visitor_id) where visitor_id is not null and status <> 'archived';
create index if not exists idx_pibr_person_journeys_stage on public.pibr_person_journeys(current_stage_id);
create index if not exists idx_pibr_person_journeys_next_contact on public.pibr_person_journeys(next_contact_at);

create table if not exists public.pibr_journey_history (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.pibr_person_journeys(id) on delete cascade,
  from_stage_id uuid references public.pibr_journey_stages(id) on delete set null,
  to_stage_id uuid references public.pibr_journey_stages(id) on delete set null,
  action_type text not null default 'stage_change' check (action_type in ('created','stage_change','note','contact','assignment','status_change')),
  note text, changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_pibr_journey_history_journey on public.pibr_journey_history(journey_id,created_at desc);

create or replace function public.pibr_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_pibr_journey_stages_updated_at on public.pibr_journey_stages;
create trigger trg_pibr_journey_stages_updated_at before update on public.pibr_journey_stages for each row execute function public.pibr_set_updated_at();
drop trigger if exists trg_pibr_person_journeys_updated_at on public.pibr_person_journeys;
create trigger trg_pibr_person_journeys_updated_at before update on public.pibr_person_journeys for each row execute function public.pibr_set_updated_at();

alter table public.pibr_journey_stages enable row level security;
alter table public.pibr_person_journeys enable row level security;
alter table public.pibr_journey_history enable row level security;

drop policy if exists pibr_journey_stages_admin_read on public.pibr_journey_stages;
drop policy if exists pibr_journey_stages_admin_insert on public.pibr_journey_stages;
drop policy if exists pibr_journey_stages_admin_update on public.pibr_journey_stages;
drop policy if exists pibr_journey_stages_admin_delete on public.pibr_journey_stages;
create policy pibr_journey_stages_admin_read on public.pibr_journey_stages for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_journey_stages_admin_insert on public.pibr_journey_stages for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_journey_stages_admin_update on public.pibr_journey_stages for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_journey_stages_admin_delete on public.pibr_journey_stages for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_person_journeys_admin_read on public.pibr_person_journeys;
drop policy if exists pibr_person_journeys_admin_insert on public.pibr_person_journeys;
drop policy if exists pibr_person_journeys_admin_update on public.pibr_person_journeys;
drop policy if exists pibr_person_journeys_admin_delete on public.pibr_person_journeys;
create policy pibr_person_journeys_admin_read on public.pibr_person_journeys for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_person_journeys_admin_insert on public.pibr_person_journeys for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_person_journeys_admin_update on public.pibr_person_journeys for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_person_journeys_admin_delete on public.pibr_person_journeys for delete to authenticated using (app_private.pibr_is_admin());

drop policy if exists pibr_journey_history_admin_read on public.pibr_journey_history;
drop policy if exists pibr_journey_history_admin_insert on public.pibr_journey_history;
drop policy if exists pibr_journey_history_admin_update on public.pibr_journey_history;
drop policy if exists pibr_journey_history_admin_delete on public.pibr_journey_history;
create policy pibr_journey_history_admin_read on public.pibr_journey_history for select to authenticated using (app_private.pibr_is_admin());
create policy pibr_journey_history_admin_insert on public.pibr_journey_history for insert to authenticated with check (app_private.pibr_is_admin());
create policy pibr_journey_history_admin_update on public.pibr_journey_history for update to authenticated using (app_private.pibr_is_admin()) with check (app_private.pibr_is_admin());
create policy pibr_journey_history_admin_delete on public.pibr_journey_history for delete to authenticated using (app_private.pibr_is_admin());
