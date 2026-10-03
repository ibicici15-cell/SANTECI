-- ============================================================
-- Agnini Sanfè — Migration : notifications
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on notifications(recipient_id, read);

alter table notifications enable row level security;

drop policy if exists "notifications_owner_select" on notifications;
create policy "notifications_owner_select" on notifications for select using (auth.uid() = recipient_id);

drop policy if exists "notifications_owner_update" on notifications;
create policy "notifications_owner_update" on notifications for update using (auth.uid() = recipient_id);

-- Diffusion en direct (Supabase Realtime) pour la cloche de notifications.
alter publication supabase_realtime add table notifications;

-- ---------- Nouveau document déposé par l'agence -> notifie le voyageur ----------
create or replace function notify_new_document()
returns trigger as $$
declare
  v_traveler_id uuid;
  v_listing_title text;
begin
  select traveler_id, listing_title into v_traveler_id, v_listing_title
  from requests where id = new.request_id;

  if v_traveler_id is not null then
    insert into notifications (recipient_id, type, title, message, link)
    values (v_traveler_id, 'new_document', 'Nouveau document reçu',
      coalesce(v_listing_title, 'Une agence') || ' vient de t''envoyer un document.', '/mon-casier');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_document on request_documents;
create trigger trg_notify_new_document
  after insert on request_documents
  for each row execute function notify_new_document();

-- ---------- Réponse de l'agence à une demande -> notifie le voyageur ----------
create or replace function notify_agency_reply()
returns trigger as $$
begin
  if new.agency_reply is not null and old.agency_reply is null and new.traveler_id is not null then
    insert into notifications (recipient_id, type, title, message, link)
    values (new.traveler_id, 'agency_reply', 'Réponse reçue',
      'Une agence a répondu à ta demande concernant "' || coalesce(new.listing_title, 'ton offre') || '".',
      '/mes-demandes');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_agency_reply on requests;
create trigger trg_notify_agency_reply
  after update of agency_reply on requests
  for each row execute function notify_agency_reply();

-- ---------- Nouvelle demande -> notifie l'agence ----------
create or replace function notify_new_request()
returns trigger as $$
begin
  insert into notifications (recipient_id, type, title, message, link)
  values (new.agency_id, 'new_request', 'Nouvelle demande reçue',
    new.traveler_name || ' s''intéresse à "' || coalesce(new.listing_title, 'une annonce') || '".',
    '/agence/demandes');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_request on requests;
create trigger trg_notify_new_request
  after insert on requests
  for each row execute function notify_new_request();

-- ---------- Paiement validé -> notifie l'agence ----------
create or replace function notify_payment_approved()
returns trigger as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    insert into notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'payment_approved', 'Paiement validé',
      case when new.type = 'subscription' then 'Ton changement de formule a été validé.'
           else 'Ton boost a été validé et activé.' end,
      '/agence/abonnement');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_payment_approved on subscription_payments;
create trigger trg_notify_payment_approved
  after update of status on subscription_payments
  for each row execute function notify_payment_approved();

-- ---------- Vérification traitée -> notifie l'agence ----------
create or replace function notify_verification_processed()
returns trigger as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    insert into notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'verification_processed',
      case when new.status = 'approved' then 'Agence vérifiée !' else 'Vérification refusée' end,
      case when new.status = 'approved' then 'Ton badge "Agence vérifiée" est actif.'
           else 'Ta demande de vérification a été refusée.' end,
      '/agence/tableau-de-bord');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_verification on verification_requests;
create trigger trg_notify_verification
  after update of status on verification_requests
  for each row execute function notify_verification_processed();
