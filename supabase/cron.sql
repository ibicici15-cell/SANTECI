-- =========================================================================
-- SANTÉ-CI — Tâches planifiées (pg_cron + pg_net)
-- À exécuter APRÈS schema.sql, policies.sql et storage.sql
-- Nécessite que les extensions pg_cron et pg_net soient activées sur votre
-- projet Supabase : Database > Extensions > activer "pg_cron" et "pg_net".
--
-- ⚠️ Remplacez <PROJECT_REF> et <SERVICE_ROLE_KEY> ci-dessous avant
-- d'exécuter cette requête (Project Settings > API dans Supabase).
-- N'utilisez JAMAIS la clé service_role côté frontend — uniquement ici,
-- dans une requête SQL exécutée par vous-même côté serveur.
--
-- Alternative sans SQL : Dashboard Supabase → Edge Functions →
-- taches-planifiees → Schedules → créer une planification (ex : */15 * * * *).
-- Dans ce cas, n'exécutez PAS ce fichier.
--
-- Cette étape est OPTIONNELLE : sans elle, les rappels de rendez-vous et
-- l'expiration automatique des essais/abonnements ne se déclenchent pas
-- tout seuls (vous pouvez toujours appeler creer_rappels_rdv() et
-- verifier_abonnements() manuellement dans le SQL Editor si besoin).
-- =========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sante-ci-taches-planifiees',
  '*/15 * * * *', -- toutes les 15 minutes
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/taches-planifiees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Pour lister vos tâches planifiées : select * from cron.job;
-- Pour en supprimer une      : select cron.unschedule('sante-ci-taches-planifiees');

-- =========================================================================
-- FIN — Tâches planifiées configurées
-- =========================================================================
