-- PIBR MORUMBI — PAINEL V3
-- O Supabase deste projeto já foi configurado diretamente.
-- NÃO é necessário executar um schema adicional ao atualizar os arquivos do site.
--
-- Projeto conectado:
-- https://trurqjrypocuojhmpuur.supabase.co
--
-- Tabelas PIBR utilizadas pelo painel:
-- public.pibr_user_roles
-- public.pibr_leaders
-- public.pibr_cells
-- public.pibr_ministries
-- public.pibr_events
-- public.pibr_prayer_requests
-- public.pibr_visitors
-- public.pibr_program_schedule
-- public.pibr_site_content
-- public.pibr_site_settings
--
-- Verificação opcional (somente leitura):
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'pibr_%'
order by table_name;
