-- ============================================================
-- Agnini Sanfè — Migration : nom d'origine des documents du casier
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

alter table request_documents add column if not exists file_name text;
