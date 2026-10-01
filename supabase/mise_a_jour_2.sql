-- =========================================================================
-- SANTÉ-CI — Mise à jour n°2
-- À exécuter une seule fois dans le SQL Editor Supabase (après schema.sql,
-- policies.sql, storage.sql et correctif_triggers_rls.sql).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. CORRECTIF : l'admin peut enfin valider/modifier un professionnel
--    (bug : le bouton "Valider" échouait silencieusement faute de policy).
-- -------------------------------------------------------------------------
create policy "Admin gère tous les professionnels" on public.professionnels
  for update using (public.mon_role() = 'admin');

-- -------------------------------------------------------------------------
-- 2. VÉRIFICATION PROFESSIONNELLE : document justificatif (carte pro,
--    diplôme, attestation d'exercice) à uploader par le professionnel,
--    consultable par l'admin avant validation.
-- -------------------------------------------------------------------------
alter table public.professionnels
  add column if not exists document_justificatif_url text,
  add column if not exists motif_rejet text;

insert into storage.buckets (id, name, public)
values ('verification-professionnels', 'verification-professionnels', false)
on conflict (id) do nothing;

-- Convention de chemin : verification-professionnels/{professionnel_id}/{fichier}
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

-- -------------------------------------------------------------------------
-- 3. EMPÊCHER LE DOUBLE-RENDEZ-VOUS : un même créneau ne peut pas être
--    confirmé pour deux patients différents chez le même professionnel.
--    (Contrainte au niveau base de données — la protection la plus fiable,
--    en complément de la vérification faite côté application.)
-- -------------------------------------------------------------------------
create unique index if not exists idx_rdv_creneau_confirme
  on public.rendez_vous (professionnel_id, date_heure)
  where statut = 'confirme';

-- =========================================================================
-- FIN DE LA MISE À JOUR N°2
-- =========================================================================
