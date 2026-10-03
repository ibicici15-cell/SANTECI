-- =========================================================================
-- SANTÉ-CI — Mise à jour n°16 : envoi push IMMÉDIAT
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°15).
--
-- Pourquoi : jusqu'ici, les push partaient uniquement via la tâche
-- planifiée (toutes les 15 min, et seulement si cron.sql a été exécuté).
-- Ce déclencheur appelle la fonction "taches-planifiees" dès qu'une
-- notification est créée, donc le push arrive en quelques secondes.
--
-- ⚠️ Remplacez <PROJECT_REF> et <SERVICE_ROLE_KEY> avant d'exécuter
-- (Project Settings > API). Nécessite l'extension pg_net.
-- =========================================================================

create extension if not exists pg_net;

create or replace function public.declencher_envoi_push()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/taches-planifiees',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  return new;
exception when others then
  -- ne jamais bloquer la création d'une notification à cause du push
  return new;
end;
$$;

drop trigger if exists declencher_push_apres_notification on public.notifications;
create trigger declencher_push_apres_notification
  after insert on public.notifications
  for each row execute function public.declencher_envoi_push();

-- Vérification : après avoir créé une notification de test, regardez
--   select id, status_code, content from net._http_response order by created DESC limit 5;
-- (status_code 200 = la fonction a bien été appelée)
