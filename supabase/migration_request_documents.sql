-- ============================================================
-- Agnini Sanfè — Migration : documents du casier typés et gérables
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

create table if not exists request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  path text not null,
  doc_type text not null default 'autre' check (doc_type in ('passeport', 'visa', 'billet', 'autre')),
  created_at timestamptz not null default now()
);

create index if not exists idx_request_documents_request on request_documents(request_id);

alter table request_documents enable row level security;

drop policy if exists "request_documents_agency_all" on request_documents;
create policy "request_documents_agency_all" on request_documents for all
  using (exists (select 1 from requests r where r.id = request_id and r.agency_id = auth.uid()))
  with check (exists (select 1 from requests r where r.id = request_id and r.agency_id = auth.uid()));

drop policy if exists "request_documents_traveler_read" on request_documents;
create policy "request_documents_traveler_read" on request_documents for select
  using (exists (select 1 from requests r where r.id = request_id and r.traveler_id = auth.uid()));

drop policy if exists "request_documents_admin_read" on request_documents;
create policy "request_documents_admin_read" on request_documents for select using (is_admin());
