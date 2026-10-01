-- =========================================================================
-- SANTÉ-CI — Schéma de base de données Supabase (PostgreSQL)
-- Plateforme numérique de mise en relation patients / professionnels de santé
-- =========================================================================
-- À exécuter dans l'éditeur SQL de votre projet Supabase (Database > SQL Editor)
-- Ordre d'exécution : schema.sql PUIS policies.sql PUIS storage.sql
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------
-- 1. ENUM TYPES
-- -------------------------------------------------------------------------
create type user_role as enum ('patient', 'professionnel', 'etablissement', 'admin');
create type mode_consultation as enum ('cabinet', 'teleconsultation');
create type statut_rdv as enum ('en_attente', 'confirme', 'refuse', 'annule', 'termine', 'non_honore');
create type statut_abonnement as enum ('essai', 'actif', 'expire', 'annule');
create type type_notification as enum (
  'confirmation_rdv', 'rappel_rdv', 'annulation', 'nouveau_message',
  'document_disponible', 'fin_essai', 'rappel_abonnement'
);

-- -------------------------------------------------------------------------
-- 2. PROFILS UTILISATEURS
-- -------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  email text not null,
  telephone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 3. PATIENTS
-- -------------------------------------------------------------------------
create table public.patients (
  id uuid primary key references public.profiles(id) on delete cascade,
  nom text not null,
  prenom text not null,
  date_naissance date,
  sexe text check (sexe in ('homme', 'femme', 'autre')),
  ville text,
  pays text default 'Côte d''Ivoire',
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.dossiers_medicaux (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  groupe_sanguin text,
  allergies text[],
  maladies_chroniques text[],
  traitements_en_cours text[],
  antecedents text,
  updated_at timestamptz not null default now()
);

create table public.documents_medicaux (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  rendez_vous_id uuid,
  titre text not null,
  type_document text, -- ordonnance, compte_rendu, examen, vaccination, autre
  fichier_url text not null,
  ajoute_par uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 4. ÉTABLISSEMENTS
-- -------------------------------------------------------------------------
create table public.etablissements (
  id uuid primary key references public.profiles(id) on delete cascade,
  nom text not null,
  type_etablissement text, -- clinique, cabinet, centre_sante, hopital_prive, centre_specialise
  ville text,
  pays text default 'Côte d''Ivoire',
  adresse text,
  logo_url text,
  description text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 5. PROFESSIONNELS DE SANTÉ
-- -------------------------------------------------------------------------
create table public.professionnels (
  id uuid primary key references public.profiles(id) on delete cascade,
  etablissement_id uuid references public.etablissements(id) on delete set null,
  nom text not null,
  prenom text not null,
  photo_url text,
  specialite text not null, -- medecin_generaliste, medecin_specialiste, dentiste, psychologue, sage_femme, kinesitherapeute, infirmier, nutritionniste, autre
  numero_autorisation text not null,
  pays text default 'Côte d''Ivoire',
  ville text not null,
  adresse_cabinet text,
  langues_parlees text[] default array['Français'],
  biographie text,
  experience_annees int default 0,
  tarif_consultation numeric(12,0), -- en FCFA
  modes_consultation mode_consultation[] default array['cabinet']::mode_consultation[],
  moyens_paiement text[] default array[]::text[], -- especes, carte_bancaire, virement, mobile_money, paypal
  actif boolean not null default true,
  valide_par_admin boolean not null default false,
  document_justificatif_url text,
  motif_rejet text,
  note_moyenne numeric(2,1) default 0,
  created_at timestamptz not null default now()
);

create index idx_professionnels_specialite on public.professionnels(specialite);
create index idx_professionnels_ville on public.professionnels(ville);

-- Horaires hebdomadaires (créneaux disponibles) par professionnel
create table public.horaires_disponibilite (
  id uuid primary key default uuid_generate_v4(),
  professionnel_id uuid not null references public.professionnels(id) on delete cascade,
  jour_semaine int not null check (jour_semaine between 0 and 6), -- 0 = dimanche
  heure_debut time not null,
  heure_fin time not null,
  actif boolean not null default true
);

-- Créneaux bloqués ponctuellement (congés, indisponibilités)
create table public.indisponibilites (
  id uuid primary key default uuid_generate_v4(),
  professionnel_id uuid not null references public.professionnels(id) on delete cascade,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  motif text
);

-- -------------------------------------------------------------------------
-- 6. ABONNEMENTS
-- Modèle : gratuit pour les patients ; le professionnel bénéficie d'un
-- essai gratuit d'un mois puis paie un abonnement mensuel (12 000 FCFA) ou
-- annuel (120 000 FCFA, 2 mois offerts) par transfert Mobile Money manuel,
-- vérifié par un administrateur (voir table "paiements").
-- -------------------------------------------------------------------------
create table public.abonnements (
  id uuid primary key default uuid_generate_v4(),
  professionnel_id uuid references public.professionnels(id) on delete cascade,
  etablissement_id uuid references public.etablissements(id) on delete cascade,
  statut statut_abonnement not null default 'essai',
  date_debut_essai timestamptz not null default now(),
  date_fin_essai timestamptz not null default (now() + interval '1 month'),
  plan text, -- mensuel, annuel
  date_debut_abonnement timestamptz,
  date_fin_abonnement timestamptz,
  montant numeric(12,0),
  created_at timestamptz not null default now(),
  check (professionnel_id is not null or etablissement_id is not null)
);

-- -------------------------------------------------------------------------
-- 7. RENDEZ-VOUS
-- -------------------------------------------------------------------------
create table public.rendez_vous (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  professionnel_id uuid not null references public.professionnels(id) on delete cascade,
  date_heure timestamptz not null,
  duree_minutes int not null default 30,
  mode mode_consultation not null default 'cabinet',
  statut statut_rdv not null default 'en_attente',
  motif text,
  moyen_paiement_choisi text,
  necessite_reconfirmation boolean not null default false, -- true si modifié par le patient après avoir été confirmé
  salle_teleconsultation text, -- identifiant de salle vidéo (ex: Jitsi room)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rdv_patient on public.rendez_vous(patient_id);
create index idx_rdv_pro on public.rendez_vous(professionnel_id);
create index idx_rdv_date on public.rendez_vous(date_heure);

-- Empêche qu'un même créneau soit confirmé pour deux patients différents
-- chez le même professionnel (protection au niveau base de données).
create unique index idx_rdv_creneau_confirme
  on public.rendez_vous (professionnel_id, date_heure)
  where statut = 'confirme';

-- -------------------------------------------------------------------------
-- 8. CONSULTATIONS (compte-rendu clinique lié à un rendez-vous)
-- -------------------------------------------------------------------------
create table public.consultations (
  id uuid primary key default uuid_generate_v4(),
  rendez_vous_id uuid not null references public.rendez_vous(id) on delete cascade,
  observations text,
  diagnostic text,
  recommandations text,
  created_at timestamptz not null default now()
);

create table public.ordonnances (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  professionnel_id uuid not null references public.professionnels(id) on delete cascade,
  contenu text not null, -- liste des médicaments / posologie
  examens_prescrits text[], -- analyses, radiographie, irm, scanner, echographie...
  signee boolean not null default false,
  fichier_url text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 9. PAIEMENTS
-- Utilisée pour l'abonnement professionnel (transfert Mobile Money manuel,
-- vérifié par un admin). La consultation elle-même n'est jamais payée via
-- la plateforme : le patient règle directement le professionnel.
-- -------------------------------------------------------------------------
create table public.paiements (
  id uuid primary key default uuid_generate_v4(),
  type_paiement text not null default 'abonnement', -- 'abonnement' (seul type utilisé actuellement)
  abonnement_id uuid references public.abonnements(id) on delete set null,
  rendez_vous_id uuid references public.rendez_vous(id) on delete set null,
  patient_id uuid references public.patients(id),
  professionnel_id uuid references public.professionnels(id),
  montant numeric(12,0) not null,
  moyen_paiement text not null, -- mtn_money, orange_money, wave
  telephone_emetteur text, -- numéro depuis lequel le transfert a été effectué
  reference_transaction text, -- référence donnée par l'opérateur après le transfert
  plan text, -- mensuel, annuel
  statut text not null default 'en_attente', -- en_attente, reussi, echoue, rembourse
  confirme_par uuid references public.profiles(id),
  confirme_le timestamptz,
  justificatif_url text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 10. MESSAGERIE SÉCURISÉE
-- -------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  professionnel_id uuid not null references public.professionnels(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (patient_id, professionnel_id)
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  expediteur_id uuid not null references public.profiles(id),
  contenu text,
  fichier_url text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- -------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  destinataire_id uuid not null references public.profiles(id) on delete cascade,
  type type_notification not null,
  titre text not null,
  contenu text,
  lu boolean not null default false,
  sms_envoye boolean not null default false,
  sms_tente_le timestamptz,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 12. AVIS / SIGNALEMENTS (utile pour le tableau de bord admin)
-- -------------------------------------------------------------------------
create table public.signalements (
  id uuid primary key default uuid_generate_v4(),
  auteur_id uuid references public.profiles(id),
  cible_id uuid,
  motif text not null,
  statut text not null default 'ouvert', -- ouvert, traite, rejete
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 13. TRIGGERS UTILITAIRES
-- -------------------------------------------------------------------------

-- met à jour updated_at automatiquement
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_rdv_updated_at
before update on public.rendez_vous
for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Crée automatiquement un essai gratuit d'un mois à la création d'un
-- professionnel. SECURITY DEFINER : sans cela, la RLS bloque cette écriture
-- automatique (le professionnel qui vient de s'inscrire n'a pas le droit
-- d'insérer directement dans "abonnements").
create or replace function public.creer_essai_gratuit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abonnements (professionnel_id, statut, date_debut_essai, date_fin_essai)
  values (new.id, 'essai', now(), now() + interval '1 month');
  return new;
end;
$$;

create trigger trg_creer_essai_professionnel
after insert on public.professionnels
for each row execute function public.creer_essai_gratuit();

-- notification automatique à la création d'un rendez-vous
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

create trigger trg_notifier_nouveau_rdv
after insert on public.rendez_vous
for each row execute function public.notifier_nouveau_rdv();

-- Notifie le professionnel quand un patient modifie (rendez-vous déjà
-- confirmé repassant en attente) ou annule un rendez-vous.
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

create trigger trg_notifier_changement_rdv
after update on public.rendez_vous
for each row execute function public.notifier_changement_rdv_par_patient();

-- Si le rôle d'un compte change (ex : un admin transforme un compte
-- professionnel en compte admin), sa fiche professionnelle perd
-- automatiquement sa validation et disparaît des recherches.
create or replace function public.revoquer_validation_si_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'professionnel' and old.role = 'professionnel' then
    update public.professionnels set valide_par_admin = false, actif = false where id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_revoquer_validation_role
after update of role on public.profiles
for each row execute function public.revoquer_validation_si_role_change();

-- Notification automatique quand l'admin valide ou refuse un compte professionnel.
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

create trigger trg_notifier_validation_professionnel
after update on public.professionnels
for each row execute function public.notifier_validation_professionnel();

-- Notification automatique quand un abonnement passe à "actif".
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

create trigger trg_notifier_activation_abonnement
after update on public.abonnements
for each row execute function public.notifier_activation_abonnement();

-- -------------------------------------------------------------------------
-- 14. FONCTIONS DE MAINTENANCE (appelées par la tâche planifiée)
-- -------------------------------------------------------------------------

-- Renvoie les créneaux déjà pris (en attente ou confirmés) pour un
-- professionnel donné, SANS exposer aucune autre donnée des rendez-vous
-- concernés. SECURITY DEFINER : nécessaire car un patient ne peut voir,
-- via la RLS normale, que SES PROPRES rendez-vous — sans cette fonction,
-- il ne détecterait jamais les créneaux pris par d'autres patients.
create or replace function public.creneaux_pris(p_professionnel_id uuid, p_debut timestamptz, p_fin timestamptz)
returns table(date_heure timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.date_heure
  from public.rendez_vous r
  where r.professionnel_id = p_professionnel_id
    and r.statut in ('en_attente', 'confirme')
    and r.date_heure >= p_debut
    and r.date_heure <= p_fin;
$$;

grant execute on function public.creneaux_pris(uuid, timestamptz, timestamptz) to anon, authenticated;

-- Crée les notifications de rappel pour les rendez-vous confirmés dans les
-- prochaines 24h (à appeler périodiquement, ex: toutes les heures).
create or replace function public.creer_rappels_rdv()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu)
  select r.patient_id, 'rappel_rdv', 'Rappel de rendez-vous',
         'Vous avez un rendez-vous demain avec Dr ' || p.prenom || ' ' || p.nom || '.'
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

-- Notifie les professionnels dont l'essai se termine bientôt, et fait
-- passer les abonnements expirés en statut "expire" (les retirant des
-- recherches, via la table professionnels).
create or replace function public.verifier_abonnements()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu)
  select professionnel_id, 'fin_essai', 'Votre essai gratuit se termine bientôt',
         'Il vous reste moins de 3 jours d''essai gratuit. Souscrivez un abonnement pour continuer à apparaître dans les recherches.'
  from public.abonnements
  where statut = 'essai' and date_fin_essai between now() and now() + interval '3 days'
    and not exists (
      select 1 from public.notifications n
      where n.destinataire_id = abonnements.professionnel_id and n.type = 'fin_essai'
      and n.created_at > now() - interval '4 days'
    );

  update public.abonnements
  set statut = 'expire'
  where statut = 'essai' and date_fin_essai < now();

  update public.abonnements
  set statut = 'expire'
  where statut = 'actif' and date_fin_abonnement < now();

  -- un professionnel sans abonnement actif n'apparaît plus dans les recherches
  update public.professionnels p
  set actif = false
  where exists (
    select 1 from public.abonnements a
    where a.professionnel_id = p.id and a.statut = 'expire'
  );
end;
$$;

-- =========================================================================
-- FIN DU SCHÉMA — voir policies.sql puis storage.sql
-- Pour une NOUVELLE installation, exécutez aussi supabase/mise_a_jour_7.sql
-- après storage.sql : il ajoute la collaboration entre professionnels et
-- le rôle laboratoire (tables, RLS et bucket de stockage inclus).
-- =========================================================================
