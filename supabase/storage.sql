-- =========================================================================
-- SANTÉ-CI — Supabase Storage : buckets + politiques
-- À exécuter APRÈS schema.sql et policies.sql
-- =========================================================================
-- Buckets :
--  - photos-profil               (public en lecture : photos patients/pros)
--  - documents-medicaux          (privé : dossiers, comptes-rendus, examens)
--  - ordonnances                 (privé : ordonnances PDF)
--  - verification-professionnels (privé : carte pro / diplôme, pour l'admin)
--
-- Convention de chemin obligatoire pour que les politiques fonctionnent :
--   photos-profil/{user_id}/photo.jpg
--   documents-medicaux/{patient_id}/{horodatage}-{nom_fichier}
--   ordonnances/{patient_id}/{horodatage}-{nom_fichier}
--   verification-professionnels/{professionnel_id}/{fichier}
-- =========================================================================

insert into storage.buckets (id, name, public)
values
  ('photos-profil', 'photos-profil', true),
  ('documents-medicaux', 'documents-medicaux', false),
  ('ordonnances', 'ordonnances', false),
  ('verification-professionnels', 'verification-professionnels', false)
on conflict (id) do nothing;

-- -------------------------------------------------------------------------
-- PHOTOS DE PROFIL (public en lecture, écriture réservée au propriétaire)
-- -------------------------------------------------------------------------
create policy "lecture publique photos profil"
on storage.objects for select
using (bucket_id = 'photos-profil');

create policy "televersement de sa propre photo"
on storage.objects for insert
with check (
  bucket_id = 'photos-profil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "remplacement de sa propre photo"
on storage.objects for update
using (bucket_id = 'photos-profil' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "suppression de sa propre photo"
on storage.objects for delete
using (bucket_id = 'photos-profil' and (storage.foldername(name))[1] = auth.uid()::text);

-- -------------------------------------------------------------------------
-- DOCUMENTS MÉDICAUX (privé)
-- -------------------------------------------------------------------------
create policy "lecture documents medicaux autorisee"
on storage.objects for select
using (
  bucket_id = 'documents-medicaux'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.rendez_vous r
      where r.patient_id = ((storage.foldername(name))[1])::uuid
      and r.professionnel_id = auth.uid()
    )
    or public.mon_role() = 'admin'
  )
);

create policy "televersement documents medicaux autorise"
on storage.objects for insert
with check (
  bucket_id = 'documents-medicaux'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.rendez_vous r
      where r.patient_id = ((storage.foldername(name))[1])::uuid
      and r.professionnel_id = auth.uid()
    )
  )
);

create policy "suppression documents medicaux par le patient"
on storage.objects for delete
using (bucket_id = 'documents-medicaux' and (storage.foldername(name))[1] = auth.uid()::text);

-- -------------------------------------------------------------------------
-- ORDONNANCES (privé) — même logique que les documents médicaux
-- -------------------------------------------------------------------------
create policy "lecture ordonnances autorisee"
on storage.objects for select
using (
  bucket_id = 'ordonnances'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.rendez_vous r
      where r.patient_id = ((storage.foldername(name))[1])::uuid
      and r.professionnel_id = auth.uid()
    )
    or public.mon_role() = 'admin'
  )
);

create policy "televersement ordonnances autorise"
on storage.objects for insert
with check (
  bucket_id = 'ordonnances'
  and exists (
    select 1 from public.rendez_vous r
    where r.patient_id = ((storage.foldername(name))[1])::uuid
    and r.professionnel_id = auth.uid()
  )
);

-- -------------------------------------------------------------------------
-- VÉRIFICATION PROFESSIONNELLE (privé) — carte pro / diplôme / attestation
-- -------------------------------------------------------------------------
create policy "pro televerse son justificatif"
on storage.objects for insert
with check (
  bucket_id = 'verification-professionnels'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "lecture justificatif par le proprietaire ou l'admin"
on storage.objects for select
using (
  bucket_id = 'verification-professionnels'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.mon_role() = 'admin'
  )
);

-- =========================================================================
-- FIN — Storage configuré
-- =========================================================================
