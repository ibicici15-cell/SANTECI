-- ============================================================
-- Agnini Sanfè — Migration : règles de publication (halal strict)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

alter table agencies add column if not exists accepted_publishing_rules boolean not null default false;
alter table agencies add column if not exists publishing_rules_accepted_at timestamptz;
alter table agencies add column if not exists welcome_message_seen boolean not null default false;
