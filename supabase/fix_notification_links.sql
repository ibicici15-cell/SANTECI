-- ============================================================
-- Agnini Sanfè — Liens exacts des notifications
-- Supabase → SQL Editor → New query → Run (sûr à ré-exécuter)
-- Les notifications DÉJÀ reçues gardent l'ancien lien (la page s'ouvre
-- quand même) ; les nouvelles ouvrent exactement le bon endroit.
-- ============================================================

-- Nouveau document -> ouvre le dossier du casier correspondant
create or replace function public.notify_new_document()
returns trigger as $$
declare
  v_traveler_id uuid;
  v_listing_title text;
begin
  select traveler_id, listing_title into v_traveler_id, v_listing_title
  from public.requests where id = new.request_id;

  if v_traveler_id is not null then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (v_traveler_id, 'new_document', 'Nouveau document reçu',
      coalesce(v_listing_title, 'Une agence') || ' vient de t''envoyer un document.',
      '/mon-casier#demande-' || new.request_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Paiement validé -> ouvre l'historique de paiement
create or replace function public.notify_payment_approved()
returns trigger as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'payment_approved', 'Paiement validé',
      case when new.type = 'subscription' then 'Ton changement de formule a été validé.'
           else 'Ton boost a été validé et activé.' end,
      '/agence/abonnement#historique-paiement');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Vérification : refusée -> ouvre le bandeau de vérification ; acceptée -> haut du tableau de bord
create or replace function public.notify_verification_processed()
returns trigger as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'verification_processed',
      case when new.status = 'approved' then 'Agence vérifiée !' else 'Vérification refusée' end,
      case when new.status = 'approved' then 'Ton badge "Agence vérifiée" est actif.'
           else 'Ta demande de vérification a été refusée.' end,
      case when new.status = 'approved' then '/agence/tableau-de-bord'
           else '/agence/tableau-de-bord#verification' end);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
