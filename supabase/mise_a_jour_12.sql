-- =========================================================================
-- SANTÉ-CI — Mise à jour n°12
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°11).
-- =========================================================================

-- -------------------------------------------------------------------------
-- Jusqu'ici, "visiter une page" marquait TOUTES les notifications de cette
-- page comme lues d'un coup. Or dans la messagerie, chaque conversation a
-- son propre compteur, qui décroît quand ON OUVRE CETTE conversation
-- précise — pas les autres. On applique le même principe : chaque
-- notification pointe maintenant vers l'élément précis concerné
-- (rendez-vous, compte-rendu, demande d'analyse, demande de collaboration…)
-- via "entite_id", et le badge de chaque ligne de la liste ne disparaît
-- que quand CETTE ligne est consultée.
-- -------------------------------------------------------------------------
alter table public.notifications
  add column if not exists entite_id uuid;

create index if not exists idx_notifications_destinataire_lien_entite
  on public.notifications (destinataire_id, lien, entite_id) where lu = false;

-- ---------- RENDEZ-VOUS ----------
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
  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (v_pro_user_id, 'confirmation_rdv', 'Nouveau rendez-vous', 'Un patient a demandé un rendez-vous.', '/professionnel/rendez-vous', new.id);
  return new;
end;
$$;

create or replace function public.notifier_changement_rdv_par_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'annule' and old.statut <> 'annule' then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.professionnel_id, 'annulation', 'Rendez-vous annulé', 'Le patient a annulé ce rendez-vous.', '/professionnel/rendez-vous', new.id);
  elsif new.necessite_reconfirmation = true and coalesce(old.necessite_reconfirmation, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.professionnel_id, 'confirmation_rdv', 'Rendez-vous modifié par le patient', 'Ce rendez-vous a été modifié : merci de le reconfirmer.', '/professionnel/rendez-vous', new.id);
  end if;
  return new;
end;
$$;

create or replace function public.creer_rappels_rdv()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  select r.patient_id, 'rappel_rdv', 'Rappel de rendez-vous',
         'Vous avez un rendez-vous demain avec Dr ' || p.prenom || ' ' || p.nom || '.',
         '/patient/rendez-vous', r.id
  from public.rendez_vous r
  join public.professionnels p on p.id = r.professionnel_id
  where r.statut = 'confirme'
    and r.date_heure between now() + interval '23 hours' and now() + interval '25 hours'
    and not exists (
      select 1 from public.notifications n
      where n.destinataire_id = r.patient_id and n.type = 'rappel_rdv' and n.entite_id = r.id
    );
end;
$$;

-- ---------- COLLABORATIONS ----------
create or replace function public.notifier_nouvelle_demande_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (new.professionnel_id, 'confirmation_rdv', 'Un confrère a besoin de vous',
          'Une demande de collaboration vous a été envoyée. Consultez "Mes collaborations".', '/professionnel/collaborations', new.demande_id);
  return new;
end;
$$;

create or replace function public.notifier_reponse_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demandeur_id uuid;
  v_nom_pro text;
begin
  if new.statut = old.statut then
    return new;
  end if;
  if new.statut not in ('acceptee', 'refusee') then
    return new;
  end if;

  select demandeur_id into v_demandeur_id from public.demandes_collaboration where id = new.demande_id;
  select prenom || ' ' || nom into v_nom_pro from public.professionnels where id = new.professionnel_id;

  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (
    v_demandeur_id,
    'confirmation_rdv',
    case when new.statut = 'acceptee' then 'Un confrère a accepté' else 'Un confrère a refusé' end,
    'Dr ' || v_nom_pro || case when new.statut = 'acceptee' then ' a accepté votre demande de collaboration.' else ' ne peut pas donner suite à votre demande.' end,
    '/professionnel/collaborations',
    new.demande_id
  );
  return new;
end;
$$;

-- ---------- ANALYSES ----------
create or replace function public.notifier_nouvelle_demande_analyse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (new.labo_id, 'confirmation_rdv', 'Nouvelle demande d''analyse', 'Un demandeur a soumis une nouvelle demande.', '/laboratoire/tableau-de-bord', new.id);
  return new;
end;
$$;

create or replace function public.notifier_reponse_analyse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destinataire uuid;
begin
  v_destinataire := coalesce(new.demandeur_professionnel_id, new.demandeur_patient_id);

  if new.statut <> old.statut and new.statut = 'confirme' then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (v_destinataire, 'confirmation_rdv', 'Demande d''analyse confirmée', 'Le laboratoire a confirmé votre demande.', '/mes-analyses', new.id);
  elsif new.statut <> old.statut and new.statut = 'refuse' then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (v_destinataire, 'confirmation_rdv', 'Demande d''analyse refusée', 'Le laboratoire ne peut pas traiter cette demande.', '/mes-analyses', new.id);
  elsif new.fichier_resultat is not null and old.fichier_resultat is null then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (v_destinataire, 'document_disponible', 'Résultat disponible', 'Le laboratoire a transmis le résultat de votre analyse.', '/mes-analyses', new.id);
  end if;
  return new;
end;
$$;

-- ---------- VALIDATION PROFESSIONNEL (page à vue unique, entite_id gardé pour cohérence) ----------
create or replace function public.notifier_validation_professionnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.valide_par_admin = true and coalesce(old.valide_par_admin, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.id, 'confirmation_rdv', 'Compte validé', 'Votre compte professionnel a été validé. Vous apparaissez désormais dans les recherches.', '/professionnel/profil', new.id);
  elsif new.valide_par_admin = false and old.valide_par_admin = false
        and new.motif_rejet is distinct from old.motif_rejet and new.motif_rejet is not null then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.id, 'confirmation_rdv', 'Document refusé', 'Votre document justificatif a été refusé : ' || new.motif_rejet || '. Veuillez en téléverser un nouveau.', '/professionnel/profil', new.id);
  end if;
  return new;
end;
$$;

-- =========================================================================
-- FIN DE LA MISE À JOUR N°12
-- =========================================================================
