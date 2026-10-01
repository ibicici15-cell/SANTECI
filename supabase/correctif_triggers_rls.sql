-- =========================================================================
-- SANTÉ-CI — Correctif RLS sur les triggers automatiques
-- À exécuter une seule fois dans le SQL Editor Supabase.
--
-- Problème : les fonctions déclenchées par un INSERT (créer l'essai gratuit,
-- notifier un nouveau rendez-vous) s'exécutaient avec les droits de
-- l'utilisateur qui a fait l'action (SECURITY INVOKER, comportement par
-- défaut), et la RLS bloquait alors leur propre écriture automatique dans
-- une autre table (ex : un professionnel ne peut pas insérer directement
-- dans "abonnements", ce n'est pas censé arriver à la main — seul le
-- trigger doit le faire, avec des droits élevés).
--
-- Solution : ces fonctions passent en SECURITY DEFINER, avec un
-- search_path fixé (bonne pratique de sécurité Postgres).
-- =========================================================================

create or replace function public.creer_essai_gratuit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abonnements (professionnel_id, statut, date_debut_essai, date_fin_essai)
  values (new.id, 'essai', now(), now() + interval '14 days');
  return new;
end;
$$;

create or replace function public.notifier_nouveau_rdv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro_user_id uuid;
begin
  select id into v_pro_user_id from public.professionnels where id = new.professionnel_id;
  insert into public.notifications (destinataire_id, type, titre, contenu)
  values (v_pro_user_id, 'confirmation_rdv', 'Nouveau rendez-vous', 'Un patient a demandé un rendez-vous.');
  return new;
end;
$$;

-- =========================================================================
-- FIN DU CORRECTIF
-- =========================================================================
