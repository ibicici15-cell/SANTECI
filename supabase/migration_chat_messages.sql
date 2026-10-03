-- ============================================================
-- Agnini Sanfè — Migration : discussions illimitées voyageur <-> agence
-- Supabase → SQL Editor → New query → Run (sûr à ré-exécuter)
-- ============================================================

create table if not exists request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  sender_role text not null check (sender_role in ('traveler', 'agency')),
  sender_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_request_messages_request on request_messages(request_id, created_at);

alter table request_messages enable row level security;

-- Lecture : seulement le voyageur et l'agence de cette demande
drop policy if exists "request_messages_select" on request_messages;
create policy "request_messages_select" on request_messages for select using (
  exists (
    select 1 from requests r
    where r.id = request_messages.request_id
      and (r.traveler_id = auth.uid() or r.agency_id = auth.uid())
  )
);

-- Écriture : en son propre nom, et uniquement dans ses propres conversations
drop policy if exists "request_messages_insert" on request_messages;
create policy "request_messages_insert" on request_messages for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from requests r
    where r.id = request_messages.request_id
      and (
        (request_messages.sender_role = 'traveler' and r.traveler_id = auth.uid())
        or (request_messages.sender_role = 'agency' and r.agency_id = auth.uid())
      )
  )
);

-- Réception en direct dans l'app
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'request_messages'
  ) then
    alter publication supabase_realtime add table public.request_messages;
  end if;
end $$;

-- Chaque message notifie l'autre personne (cloche + push)
create or replace function public.notify_new_chat_message()
returns trigger as $$
declare
  r record;
  v_preview text;
begin
  select traveler_id, agency_id, traveler_name into r
  from public.requests where id = new.request_id;

  v_preview := left(new.body, 120);

  if new.sender_role = 'traveler' then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (r.agency_id, 'new_message',
      'Nouveau message de ' || coalesce(r.traveler_name, 'un voyageur'),
      v_preview, '/agence/demandes#demande-' || new.request_id);
  elsif r.traveler_id is not null then
    insert into public.notifications (recipient_id, type, title, message, link)
    values (r.traveler_id, 'new_message', 'Nouveau message de l''agence',
      v_preview, '/mes-demandes#demande-' || new.request_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_new_chat_message on public.request_messages;
create trigger trg_notify_new_chat_message
  after insert on public.request_messages
  for each row execute function public.notify_new_chat_message();
