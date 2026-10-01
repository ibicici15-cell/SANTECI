-- =========================================================================
-- SANTÉ-CI — Mise à jour n°6
-- À exécuter une seule fois dans le SQL Editor Supabase.
-- Ajoute les notifications visibles pour : validation/refus de compte
-- professionnel, activation d'abonnement — et autorise un utilisateur à
-- créer une notification pour lui-même (utilisé pour le rappel "essai
-- bientôt terminé" côté client, sans dépendre d'une tâche planifiée).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Notification automatique quand l'admin valide ou refuse un compte
--    professionnel (déclenchée par le changement de "valide_par_admin").
-- -------------------------------------------------------------------------
create or replace function public.notifier_validation_professionnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.valide_par_admin = true and coalesce(old.valide_par_admin, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (new.id, 'confirmation_rdv', 'Compte validé', 'Votre compte professionnel a été validé. Vous apparaissez désormais dans les recherches.');
  elsif new.valide_par_admin = false and old.valide_par_admin = false
        and new.motif_rejet is distinct from old.motif_rejet and new.motif_rejet is not null then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (new.id, 'confirmation_rdv', 'Document refusé', 'Votre document justificatif a été refusé : ' || new.motif_rejet || '. Veuillez en téléverser un nouveau.');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_validation_professionnel on public.professionnels;
create trigger trg_notifier_validation_professionnel
after update on public.professionnels
for each row execute function public.notifier_validation_professionnel();

-- -------------------------------------------------------------------------
-- 2. Notification automatique quand un abonnement passe à "actif"
--    (après confirmation d'un paiement manuel par l'admin).
-- -------------------------------------------------------------------------
create or replace function public.notifier_activation_abonnement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'actif' and coalesce(old.statut, '') <> 'actif' and new.professionnel_id is not null then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (new.professionnel_id, 'rappel_abonnement', 'Abonnement activé', 'Votre paiement a été confirmé, votre abonnement est actif.');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_activation_abonnement on public.abonnements;
create trigger trg_notifier_activation_abonnement
after update on public.abonnements
for each row execute function public.notifier_activation_abonnement();

-- -------------------------------------------------------------------------
-- 3. Un utilisateur peut créer une notification pour LUI-MÊME (utilisé pour
--    le rappel "essai bientôt terminé" déclenché côté client à la visite du
--    tableau de bord, sans dépendre d'une tâche planifiée serveur).
-- -------------------------------------------------------------------------
create policy "Utilisateur cree ses propres notifications" on public.notifications
  for insert with check (destinataire_id = auth.uid());

-- =========================================================================
-- FIN DE LA MISE À JOUR N°6
-- =========================================================================
