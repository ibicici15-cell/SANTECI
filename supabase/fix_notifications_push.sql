-- ============================================================
-- Agnini Sanfè — Réparation complète des notifications + push
-- Supabase → SQL Editor → New query → coller → REMPLACER la valeur
-- ci-dessous (TON_SECRET) → Run. Sûr à ré-exécuter.
-- ============================================================

-- 1) Diffusion en direct pour la cloche (ne plante pas si déjà active)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- 2) Fonctions de notification (liens profonds vers la bonne conversation)
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
      coalesce(v_listing_title, 'Une agence') || ' vient de t''envoyer un document.', '/mon-casier');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_agency_reply()
returns trigger as $$
begin
  if new.agency_reply is not null and old.agency_reply is null and new.traveler_id is not null then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (new.traveler_id, 'agency_reply', 'Réponse reçue',
      'Une agence a répondu à ta demande concernant "' || coalesce(new.listing_title, 'ton offre') || '".',
      '/mes-demandes#demande-' || new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_new_request()
returns trigger as $$
begin
  insert into public.notifications (recipient_id, type, title, message, link)
  values (new.agency_id, 'new_request', 'Nouvelle demande reçue',
    new.traveler_name || ' s''intéresse à "' || coalesce(new.listing_title, 'une annonce') || '".',
    '/agence/demandes#demande-' || new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_payment_approved()
returns trigger as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'payment_approved', 'Paiement validé',
      case when new.type = 'subscription' then 'Ton changement de formule a été validé.'
           else 'Ton boost a été validé et activé.' end,
      '/agence/abonnement');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_verification_processed()
returns trigger as $$
begin
  if new.status in ('approved', 'rejected') and old.status = 'pending' then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (new.agency_id, 'verification_processed',
      case when new.status = 'approved' then 'Agence vérifiée !' else 'Vérification refusée' end,
      case when new.status = 'approved' then 'Ton badge "Agence vérifiée" est actif.'
           else 'Ta demande de vérification a été refusée.' end,
      '/agence/tableau-de-bord');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3) Déclencheurs (recréés seulement si la table existe)
do $$
begin
  if to_regclass('public.request_documents') is not null then
    drop trigger if exists trg_notify_new_document on public.request_documents;
    create trigger trg_notify_new_document after insert on public.request_documents
      for each row execute function public.notify_new_document();
  else
    raise notice 'Table request_documents absente : exécute migration_request_documents.sql';
  end if;

  if to_regclass('public.requests') is not null then
    drop trigger if exists trg_notify_agency_reply on public.requests;
    create trigger trg_notify_agency_reply after update of agency_reply on public.requests
      for each row execute function public.notify_agency_reply();
    drop trigger if exists trg_notify_new_request on public.requests;
    create trigger trg_notify_new_request after insert on public.requests
      for each row execute function public.notify_new_request();
  end if;

  if to_regclass('public.subscription_payments') is not null then
    drop trigger if exists trg_notify_payment_approved on public.subscription_payments;
    create trigger trg_notify_payment_approved after update of status on public.subscription_payments
      for each row execute function public.notify_payment_approved();
  end if;

  if to_regclass('public.verification_requests') is not null then
    drop trigger if exists trg_notify_verification on public.verification_requests;
    create trigger trg_notify_verification after update of status on public.verification_requests
      for each row execute function public.notify_verification_processed();
  end if;
end $$;

-- 4) Envoi push : à chaque notification, appelle la fonction send-push
create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://gjltqabqarpkaegdrvjk.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', 'TON_SECRET'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'notifications',
        'schema', 'public',
        'record', to_jsonb(new)
      )
    );
  exception when others then
    -- un souci d'envoi ne doit jamais empêcher d'enregistrer la notification
    raise warning 'push_on_notification: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();
