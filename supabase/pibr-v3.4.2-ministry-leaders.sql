-- PIBR Morumbi — V3.4.2
-- Integração Líderes ↔ Ministérios
-- Migração aplicada no Supabase conectado em 19/08/2026.
-- Mantida neste pacote para versionamento e recuperação.

alter table public.pibr_ministries
  add column if not exists vice_leader_id uuid references public.pibr_leaders(id) on delete set null;

create index if not exists idx_pibr_ministries_vice_leader
  on public.pibr_ministries(vice_leader_id);
