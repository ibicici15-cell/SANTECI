-- =========================================================================
-- SANTÉ-CI — Mise à jour n°10
-- À exécuter une seule fois dans le SQL Editor Supabase.
-- =========================================================================

-- "Trouver une expertise" (mise en relation entre confrères) renvoyait une
-- liste vide car "accepte_collaborations" est une colonne opt-in, avec
-- valeur par défaut false : un professionnel nouvellement inscrit ou
-- validé n'apparaissait donc jamais tant qu'il n'avait pas explicitement
-- activé le réglage dans son profil. On passe en opt-out (visible par
-- défaut, avec la possibilité de se retirer depuis le profil) et on
-- corrige les comptes déjà existants.
alter table public.professionnels
  alter column accepte_collaborations set default true;

update public.professionnels
  set accepte_collaborations = true
  where accepte_collaborations = false;

-- -------------------------------------------------------------------------
-- Badges de notification par section (et pas seulement sur la messagerie).
-- On ajoute une colonne "lien" qui indique vers quelle page de l'app une
-- notification renvoie, pour que chaque onglet (Mes rendez-vous, Mes
-- analyses, Mes collaborations, Mon abonnement...) puisse afficher son
-- propre badge "non lu", en plus de la cloche générale.
-- -------------------------------------------------------------------------
alter table public.notifications
  add column if not exists lien text;

-- ---------- RENDEZ-VOUS (côté professionnel) ----------
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
  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  values (v_pro_user_id, 'confirmation_rdv', 'Nouveau rendez-vous', 'Un patient a demandé un rendez-vous.', '/professionnel/rendez-vous');
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
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (new.professionnel_id, 'annulation', 'Rendez-vous annulé', 'Le patient a annulé ce rendez-vous.', '/professionnel/rendez-vous');
  elsif new.necessite_reconfirmation = true and coalesce(old.necessite_reconfirmation, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (new.professionnel_id, 'confirmation_rdv', 'Rendez-vous modifié par le patient', 'Ce rendez-vous a été modifié : merci de le reconfirmer.', '/professionnel/rendez-vous');
  end if;
  return new;
end;
$$;

-- Rappels de rendez-vous (côté patient)
create or replace function public.creer_rappels_rdv()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  select r.patient_id, 'rappel_rdv', 'Rappel de rendez-vous',
         'Vous avez un rendez-vous demain avec Dr ' || p.prenom || ' ' || p.nom || '.',
         '/patient/rendez-vous'
  from public.rendez_vous r
  join public.professionnels p on p.id = r.professionnel_id
  where r.statut = 'confirme'
    and r.date_heure between now() + interval '23 hours' and now() + interval '25 hours'
    and not exists (
      select 1 from public.notifications n
      where n.destinataire_id = r.patient_id and n.type = 'rappel_rdv'
      and n.created_at > now() - interval '2 days'
      and n.contenu like '%' || p.nom || '%'
    );
end;
$$;

-- ---------- VALIDATION / PROFIL PROFESSIONNEL ----------
create or replace function public.notifier_validation_professionnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.valide_par_admin = true and coalesce(old.valide_par_admin, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (new.id, 'confirmation_rdv', 'Compte validé', 'Votre compte professionnel a été validé. Vous apparaissez désormais dans les recherches.', '/professionnel/profil');
  elsif new.valide_par_admin = false and old.valide_par_admin = false
        and new.motif_rejet is distinct from old.motif_rejet and new.motif_rejet is not null then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (new.id, 'confirmation_rdv', 'Document refusé', 'Votre document justificatif a été refusé : ' || new.motif_rejet || '. Veuillez en téléverser un nouveau.', '/professionnel/profil');
  end if;
  return new;
end;
$$;

-- ---------- ABONNEMENTS (pros ET labos — le labo_id était oublié) ----------
create or replace function public.notifier_activation_abonnement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'actif' and coalesce(old.statut, '') <> 'actif' then
    if new.professionnel_id is not null then
      insert into public.notifications (destinataire_id, type, titre, contenu, lien)
      values (new.professionnel_id, 'rappel_abonnement', 'Abonnement activé', 'Votre paiement a été confirmé, votre abonnement est actif.', '/professionnel/abonnement');
    elsif new.labo_id is not null then
      insert into public.notifications (destinataire_id, type, titre, contenu, lien)
      values (new.labo_id, 'rappel_abonnement', 'Abonnement activé', 'Votre paiement a été confirmé, votre abonnement est actif.', '/laboratoire/abonnement');
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.verifier_abonnements()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  select professionnel_id, 'fin_essai', 'Votre essai gratuit se termine bientôt',
         'Il vous reste moins de 3 jours d''essai gratuit. Souscrivez un abonnement pour continuer à apparaître dans les recherches.',
         '/professionnel/abonnement'
  from public.abonnements
  where statut = 'essai' and professionnel_id is not null and date_fin_essai between now() and now() + interval '3 days'
    and not exists (
      select 1 from public.notifications n
      where n.destinataire_id = abonnements.professionnel_id and n.type = 'fin_essai'
      and n.created_at > now() - interval '4 days'
    );

  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  select labo_id, 'fin_essai', 'Votre essai gratuit se termine bientôt',
         'Il vous reste moins de 3 jours d''essai gratuit. Souscrivez un abonnement pour continuer à apparaître dans les recherches.',
         '/laboratoire/abonnement'
  from public.abonnements
  where statut = 'essai' and labo_id is not null and date_fin_essai between now() and now() + interval '3 days'
    and not exists (
      select 1 from public.notifications n
      where n.destinataire_id = abonnements.labo_id and n.type = 'fin_essai'
      and n.created_at > now() - interval '4 days'
    );

  update public.abonnements
  set statut = 'expire'
  where statut = 'essai' and date_fin_essai < now();

  update public.abonnements
  set statut = 'expire'
  where statut = 'actif' and date_fin_abonnement < now();

  -- un professionnel/labo sans abonnement actif n'apparaît plus dans les recherches
  update public.professionnels p
  set actif = false
  where exists (
    select 1 from public.abonnements a
    where a.professionnel_id = p.id and a.statut = 'expire'
  );

  update public.laboratoires l
  set actif = false
  where exists (
    select 1 from public.abonnements a
    where a.labo_id = l.id and a.statut = 'expire'
  );
end;
$$;

-- ---------- COLLABORATIONS ENTRE CONFRÈRES ----------
create or replace function public.notifier_nouvelle_demande_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  values (new.professionnel_id, 'confirmation_rdv', 'Un confrère a besoin de vous',
          'Une demande de collaboration vous a été envoyée. Consultez "Mes collaborations".', '/professionnel/collaborations');
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

  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  values (
    v_demandeur_id,
    'confirmation_rdv',
    case when new.statut = 'acceptee' then 'Un confrère a accepté' else 'Un confrère a refusé' end,
    'Dr ' || v_nom_pro || case when new.statut = 'acceptee' then ' a accepté votre demande de collaboration.' else ' ne peut pas donner suite à votre demande.' end,
    '/professionnel/collaborations'
  );
  return new;
end;
$$;

-- ---------- ANALYSES DE LABORATOIRE ----------
create or replace function public.notifier_nouvelle_demande_analyse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu, lien)
  values (new.labo_id, 'confirmation_rdv', 'Nouvelle demande d''analyse', 'Un demandeur a soumis une nouvelle demande.', '/laboratoire/tableau-de-bord');
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
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (v_destinataire, 'confirmation_rdv', 'Demande d''analyse confirmée', 'Le laboratoire a confirmé votre demande.', '/mes-analyses');
  elsif new.statut <> old.statut and new.statut = 'refuse' then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (v_destinataire, 'confirmation_rdv', 'Demande d''analyse refusée', 'Le laboratoire ne peut pas traiter cette demande.', '/mes-analyses');
  elsif new.fichier_resultat is not null and old.fichier_resultat is null then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien)
    values (v_destinataire, 'document_disponible', 'Résultat disponible', 'Le laboratoire a transmis le résultat de votre analyse.', '/mes-analyses');
  end if;
  return new;
end;
$$;

-- =========================================================================
-- FIN DE LA MISE À JOUR N°10
-- =========================================================================
