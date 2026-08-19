-- PIBR Morumbi — V3.4 Atualização 06 — Permissões + Manutenção
-- JÁ APLICADA no Supabase conectado em 18/08/2026.

-- Principais estruturas desta atualização:
-- 1) enum pibr_role ganhou maintenance
-- 2) pibr_module_permissions(user_id,module,access_level)
-- 3) pibr_scope_permissions(user_id,scope_type,scope_id,access_level)
-- 4) RPCs pibr_my_module_access(text) e pibr_my_access_summary()
-- 5) app_private.pibr_is_maintenance()
-- 6) políticas de pibr_program_schedule, pibr_site_content e pibr_site_settings: escrita somente Manutenção
-- 7) pibr_media_items continua gerenciável por Mídia/Manutenção
-- 8) eventos publicados só podem ser alterados/publicados pela Manutenção
-- 9) triggers protegem campos públicos de células, ministérios e líderes
-- 10) proteção de uma única conta com role maintenance.

-- A conta exclusiva de Manutenção já foi vinculada no projeto conectado.
-- Não execute este arquivo manualmente no projeto atual.
