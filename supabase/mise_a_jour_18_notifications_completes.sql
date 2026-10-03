-- =========================================================================
-- SANTÉ-CI — Mise à jour n°18 : notifications (et donc push) COMPLÈTES
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°17).
-- Idempotent : peut être relancée sans risque.
--
-- Ce qui n'envoyait AUCUNE notification jusqu'ici :
--   1. Les messages de chat (patient/pro, labo, confrères)
--   2. La confirmation / le refus d'un RDV par le professionnel (le patient
--      n'était jamais prévenu)
--   3. L'annulation d'un RDV par le professionnel
--   4. Le compte-rendu disponible (l'insertion côté application était refusée
--      par les règles de sécurité : un utilisateur ne peut créer une
--      notification que pour lui-même)
--   5. Un document ajouté par un professionnel dans le dossier du patient
--
-- Tout est fait côté base (déclencheurs) : c'est fiable et ça déclenche
-- automatiquement le push via le déclencheur de la mise à jour n°16.
-- =========================================================================

-- ---------- Outil : nom lisible d'un utilisateur ----------------------------
create or replace function public.nom_affichable(p_id uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select 'Dr ' || prenom || ' ' || nom from public.professionnels where id = p_id),
    (select prenom || ' ' || nom from public.patients where id = p_id),
    (select nom from public.laboratoires where id = p_id),
    'Un utilisateur'
  );
$$;

-- ---------- 1. MESSAGES -----------------------------------------------------
-- Pas de contenu du message dans la notification (écran verrouillé = données
-- de santé potentielles) : uniquement "X vous a écrit".
-- Anti-spam : une seule notification par conversation et par minute.
-- La notification est créée déjà "lue" : la messagerie a son propre badge de
-- non-lus, on évite de compter deux fois dans la cloche. Le push, lui, part.
-- Pas de SMS pour les messages (sms_envoye = true) : trop coûteux.
create or replace function public.creer_notif_message(
  p_dest uuid, p_expediteur uuid, p_lien text, p_conversation uuid
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if p_dest is null or p_dest = p_expediteur then return; end if;

  if exists (
    select 1 from public.notifications n
    where n.destinataire_id = p_dest
      and n.type = 'nouveau_message'
      and n.entite_id = p_conversation
      and n.created_at > now() - interval '60 seconds'
  ) then
    return;
  end if;

  insert into public.notifications
    (destinataire_id, type, titre, contenu, lien, entite_id, lu, sms_envoye)
  values
    (p_dest, 'nouveau_message', 'Nouveau message',
     public.nom_affichable(p_expediteur) || ' vous a écrit.',
     p_lien, p_conversation, true, true);
end;
$$;

create or replace function public.notifier_nouveau_message()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  c record;
  v_dest uuid;
begin
  select patient_id, professionnel_id into c
  from public.conversations where id = new.conversation_id;
  if not found then return new; end if;

  if new.expediteur_id = c.patient_id then
    perform public.creer_notif_message(c.professionnel_id, new.expediteur_id,
      '/professionnel/messagerie', new.conversation_id);
  else
    perform public.creer_notif_message(c.patient_id, new.expediteur_id,
      '/patient/messagerie', new.conversation_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_nouveau_message on public.messages;
create trigger trg_notifier_nouveau_message
  after insert on public.messages
  for each row execute function public.notifier_nouveau_message();

create or replace function public.notifier_nouveau_message_labo()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  c record;
  v_demandeur uuid;
begin
  select labo_id, demandeur_patient_id, demandeur_professionnel_id into c
  from public.conversations_labo where id = new.conversation_id;
  if not found then return new; end if;

  v_demandeur := coalesce(c.demandeur_professionnel_id, c.demandeur_patient_id);
  perform public.creer_notif_message(
    case when new.expediteur_id = c.labo_id then v_demandeur else c.labo_id end,
    new.expediteur_id, '/laboratoire/messagerie', new.conversation_id);
  return new;
end;
$$;

drop trigger if exists trg_notifier_nouveau_message_labo on public.messages_labo;
create trigger trg_notifier_nouveau_message_labo
  after insert on public.messages_labo
  for each row execute function public.notifier_nouveau_message_labo();

create or replace function public.notifier_nouveau_message_collab()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  c record;
begin
  select professionnel_a_id, professionnel_b_id into c
  from public.conversations_collaboration where id = new.conversation_id;
  if not found then return new; end if;

  perform public.creer_notif_message(
    case when new.expediteur_id = c.professionnel_a_id then c.professionnel_b_id else c.professionnel_a_id end,
    new.expediteur_id, '/professionnel/messagerie-confreres', new.conversation_id);
  return new;
end;
$$;

drop trigger if exists trg_notifier_nouveau_message_collab on public.messages_collaboration;
create trigger trg_notifier_nouveau_message_collab
  after insert on public.messages_collaboration
  for each row execute function public.notifier_nouveau_message_collab();

-- ---------- 2 & 3. RDV : décision / annulation par le professionnel ---------
create or replace function public.notifier_decision_rdv()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nom text;
begin
  if new.statut is not distinct from old.statut then return new; end if;
  v_nom := public.nom_affichable(new.professionnel_id);

  if new.statut = 'confirme' then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.patient_id, 'confirmation_rdv', 'Rendez-vous confirmé',
            v_nom || ' a confirmé votre rendez-vous.', '/patient/rendez-vous', new.id);
  elsif new.statut = 'refuse' then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.patient_id, 'annulation', 'Rendez-vous refusé',
            v_nom || ' ne peut pas assurer ce rendez-vous. Vous pouvez choisir un autre créneau.',
            '/patient/rendez-vous', new.id);
  elsif new.statut = 'annule' and auth.uid() is not distinct from new.professionnel_id then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.patient_id, 'annulation', 'Rendez-vous annulé',
            v_nom || ' a annulé ce rendez-vous.', '/patient/rendez-vous', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_decision_rdv on public.rendez_vous;
create trigger trg_notifier_decision_rdv
  after update of statut on public.rendez_vous
  for each row execute function public.notifier_decision_rdv();

-- Correction : quand c'est le PROFESSIONNEL qui annule, il ne doit pas
-- recevoir "Le patient a annulé ce rendez-vous".
create or replace function public.notifier_changement_rdv_par_patient()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.statut = 'annule' and old.statut <> 'annule'
     and auth.uid() is distinct from new.professionnel_id then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.professionnel_id, 'annulation', 'Rendez-vous annulé',
            'Le patient a annulé ce rendez-vous.', '/professionnel/rendez-vous', new.id);
  elsif new.necessite_reconfirmation = true and coalesce(old.necessite_reconfirmation, false) = false then
    insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
    values (new.professionnel_id, 'confirmation_rdv', 'Rendez-vous modifié par le patient',
            'Ce rendez-vous a été modifié : merci de le reconfirmer.', '/professionnel/rendez-vous', new.id);
  end if;
  return new;
end;
$$;

-- ---------- 4. COMPTE-RENDU disponible --------------------------------------
create or replace function public.notifier_compte_rendu()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_patient uuid;
begin
  select patient_id into v_patient from public.rendez_vous where id = new.rendez_vous_id;
  if v_patient is null then return new; end if;

  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (v_patient, 'document_disponible', 'Compte-rendu disponible',
          'Votre professionnel a ajouté un compte-rendu suite à votre consultation.',
          '/patient/comptes-rendus', new.id);
  return new;
end;
$$;

drop trigger if exists trg_notifier_compte_rendu on public.consultations;
create trigger trg_notifier_compte_rendu
  after insert on public.consultations
  for each row execute function public.notifier_compte_rendu();

-- ---------- 5. DOCUMENT ajouté par un professionnel -------------------------
create or replace function public.notifier_document_ajoute()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.ajoute_par is null or new.ajoute_par = new.patient_id then return new; end if;

  insert into public.notifications (destinataire_id, type, titre, contenu, lien, entite_id)
  values (new.patient_id, 'document_disponible', 'Nouveau document dans votre dossier',
          public.nom_affichable(new.ajoute_par) || ' a ajouté un document à votre dossier médical.',
          '/patient/dossier-medical', new.id);
  return new;
end;
$$;

drop trigger if exists trg_notifier_document_ajoute on public.documents_medicaux;
create trigger trg_notifier_document_ajoute
  after insert on public.documents_medicaux
  for each row execute function public.notifier_document_ajoute();

notify pgrst, 'reload schema';

-- =========================================================================
-- Déjà couverts avant cette mise à jour (rien à refaire) : nouveau RDV,
-- modification/annulation par le patient, rappel de RDV (cron), validation de
-- compte, activation d'abonnement, fin d'essai, collaborations, demandes
-- d'analyse (confirmée / refusée / RÉSULTAT DISPONIBLE).
-- =========================================================================
