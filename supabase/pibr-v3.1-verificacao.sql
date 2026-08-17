-- PIBR MORUMBI — V3.1
-- Arquivo somente de verificação. Nenhuma migração é necessária para esta atualização.

select 'pibr_visitors' as tabela, count(*) as registros from public.pibr_visitors
union all select 'pibr_events', count(*) from public.pibr_events
union all select 'pibr_cells', count(*) from public.pibr_cells
union all select 'pibr_ministries', count(*) from public.pibr_ministries
union all select 'pibr_leaders', count(*) from public.pibr_leaders
union all select 'pibr_prayer_requests', count(*) from public.pibr_prayer_requests
union all select 'pibr_program_schedule', count(*) from public.pibr_program_schedule
union all select 'pibr_site_content', count(*) from public.pibr_site_content
union all select 'pibr_site_settings', count(*) from public.pibr_site_settings
union all select 'pibr_user_roles', count(*) from public.pibr_user_roles
order by tabela;
