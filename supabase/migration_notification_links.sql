-- ============================================================
-- Agnini Sanfè — Migration : les notifications (et donc les push) ouvrent
-- directement la bonne conversation au lieu de la liste générale.
-- À exécuter APRÈS migration_notifications.sql (sûr à ré-exécuter)
-- ============================================================

-- Réponse de l'agence -> ouvre la conversation côté voyageur
create or replace function notify_agency_reply()
returns trigger as $$
begin
  if new.agency_reply is not null and old.agency_reply is null and new.traveler_id is not null then
    insert into notifications (recipient_id, type, title, message, link)
    values (new.traveler_id, 'agency_reply', 'Réponse reçue',
      'Une agence a répondu à ta demande concernant "' || coalesce(new.listing_title, 'ton offre') || '".',
      '/mes-demandes#demande-' || new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Nouvelle demande -> ouvre la conversation côté agence
create or replace function notify_new_request()
returns trigger as $$
begin
  insert into notifications (recipient_id, type, title, message, link)
  values (new.agency_id, 'new_request', 'Nouvelle demande reçue',
    new.traveler_name || ' s''intéresse à "' || coalesce(new.listing_title, 'une annonce') || '".',
    '/agence/demandes#demande-' || new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Paiement validé -> ouvre l'historique de paiement
create or replace function notify_payment_approved()
returns trigger as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    insert into notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'payment_approved', 'Paiement validé',
      case when new.type = 'subscription' then 'Ton changement de formule a été validé.'
           else 'Ton boost a été validé et activé.' end,
      '/agence/abonnement#historique-paiement');
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Vérification traitée -> ouvre le bandeau de vérification du tableau de bord
create or replace function notify_verification_processed()
returns trigger as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    insert into notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'verification_processed',
      case when new.status = 'approved' then 'Agence vérifiée !' else 'Vérification refusée' end,
      case when new.status = 'approved' then 'Ton badge "Agence vérifiée" est actif.'
           else 'Ta demande de vérification a été refusée.' end,
      '/agence/tableau-de-bord#verification');
  end if;
  return new;
end;
$$ language plpgsql security definer;
