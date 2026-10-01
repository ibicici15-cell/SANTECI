-- =========================================================================
-- SANTÉ-CI — Mise à jour n°5
-- À exécuter une seule fois dans le SQL Editor Supabase.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Distingue "nouvelle demande" de "rendez-vous modifié par le patient,
--    à reconfirmer" — pour que le professionnel voie clairement lesquels
--    étaient déjà confirmés avant d'être changés.
-- -------------------------------------------------------------------------
alter table public.rendez_vous
  add column if not exists necessite_reconfirmation boolean not null default false;

-- -------------------------------------------------------------------------
-- 2. Notifie automatiquement le professionnel quand un patient annule ou
--    modifie un rendez-vous déjà confirmé.
-- -------------------------------------------------------------------------
create or replace function public.notifier_changement_rdv_par_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'annule' and old.statut <> 'annule' then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (new.professionnel_id, 'annulation', 'Rendez-vous annulé', 'Le patient a annulé ce rendez-vous.');
  elsif new.necessite_reconfirmation = true and coalesce(old.necessite_reconfirmation, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (new.professionnel_id, 'confirmation_rdv', 'Rendez-vous modifié par le patient', 'Ce rendez-vous a été modifié : merci de le reconfirmer.');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_changement_rdv on public.rendez_vous;
create trigger trg_notifier_changement_rdv
after update on public.rendez_vous
for each row execute function public.notifier_changement_rdv_par_patient();

-- -------------------------------------------------------------------------
-- 3. Autorise la suppression de son propre historique de rendez-vous
--    (uniquement les rendez-vous "terminés" : annulé, refusé ou terminé —
--    jamais un rendez-vous encore actif, par sécurité).
-- -------------------------------------------------------------------------
create policy "Patient supprime son historique termine" on public.rendez_vous
  for delete using (patient_id = auth.uid() and statut in ('annule', 'refuse', 'termine'));

create policy "Pro supprime son historique termine" on public.rendez_vous
  for delete using (professionnel_id = auth.uid() and statut in ('annule', 'refuse', 'termine'));

-- =========================================================================
-- FIN DE LA MISE À JOUR N°5
-- =========================================================================
