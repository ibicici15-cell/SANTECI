-- ============================================================
-- Agnini Sanfè — Migration : moyens de paiement acceptés, horaires,
-- référence de paiement voyageur, "Mon casier" (documents par demande)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

alter table agencies add column if not exists accepted_payment_methods text[] default '{}';
alter table agencies add column if not exists opening_hours text;

alter table requests add column if not exists payment_reference text;
alter table requests add column if not exists documents text[] default '{}';

-- ---------- Stockage : documents échangés autour d'une demande ("Mon casier") ----------
insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', false)
on conflict (id) do nothing;

-- L'agence dépose un document dans le dossier nommé d'après l'UUID de la
-- demande (request_id) — on vérifie qu'elle est bien propriétaire de
-- cette demande avant d'autoriser l'upload.
drop policy if exists "request_docs_agency_upload" on storage.objects;
create policy "request_docs_agency_upload" on storage.objects for insert
  with check (
    bucket_id = 'request-documents'
    and exists (
      select 1 from requests r
      where r.id::text = (storage.foldername(name))[1]
        and r.agency_id = auth.uid()
    )
  );

drop policy if exists "request_docs_read" on storage.objects;
create policy "request_docs_read" on storage.objects for select
  using (
    bucket_id = 'request-documents'
    and (
      is_admin()
      or exists (
        select 1 from requests r
        where r.id::text = (storage.foldername(name))[1]
          and (r.agency_id = auth.uid() or r.traveler_id = auth.uid())
      )
    )
  );
