-- =========================================================================
-- SANTÉ-CI — Mise à jour n°17 : DURCISSEMENT DE LA SÉCURITÉ
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°16).
-- Sans danger si exécutée deux fois (tout est idempotent).
--
-- Contexte : l'application tourne avec la clé "anon" + le jeton de
-- l'utilisateur. Ce qu'une règle RLS n'interdit pas peut donc être fait par
-- n'importe quel utilisateur connecté, en contournant l'interface.
-- Les failles corrigées ici ont été trouvées en relisant policies.sql :
--
--  1. Un utilisateur pouvait se créer / se passer "admin" (profiles.role).
--  2. Un professionnel ou un labo pouvait se valider lui-même
--     (valide_par_admin = true) sans passer par l'administrateur.
--  3. Un professionnel pouvait déclarer un paiement déjà "reussi".
--  4. Tout professionnel voyait TOUS les patients de la plateforme.
--  5. Un professionnel ayant un simple RDV en attente (ou refusé) voyait le
--     dossier médical complet du patient.
--  6. Un utilisateur pouvait ajouter des documents / ordonnances dans le
--     dossier de n'importe quel patient, et écrire dans les conversations
--     des autres.
--  7. Un patient pouvait se "confirmer" lui-même un RDV ; un demandeur
--     pouvait modifier le montant d'une analyse.
--  8. Les labos n'avaient pas les droits sur leur propre abonnement/paiements.
--
-- Les appels faits depuis le SQL Editor ou une Edge Function (clé
-- service_role) ne sont PAS bloqués : auth.uid() y est nul. C'est ce qui
-- vous permet de créer votre premier administrateur à la main.
-- =========================================================================

-- ---------- Fonctions utilitaires (SECURITY DEFINER = pas de récursion RLS) --
create or replace function public.est_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Le professionnel connecté a-t-il (ou a-t-il eu) un RDV avec ce patient ?
-- p_dossier = true  -> seulement RDV confirmé/terminé (accès au dossier médical)
-- p_dossier = false -> quel que soit le statut (nécessaire pour voir le nom du
--                      patient dans la liste des RDV, y compris refusés/annulés)
create or replace function public.pro_suit_patient(p_patient uuid, p_dossier boolean default true)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rendez_vous r
    where r.patient_id = p_patient
      and r.professionnel_id = auth.uid()
      and (not p_dossier or r.statut in ('confirme', 'termine'))
  );
$$;

create or replace function public.labo_traite_patient(p_patient uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.demandes_analyse d
    where d.demandeur_patient_id = p_patient and d.labo_id = auth.uid()
  );
$$;

-- ---------- 1. PROFILS : plus d'auto-promotion en administrateur ------------
create or replace function public.proteger_profiles()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.est_admin() then return new; end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'Création d''un compte administrateur interdite.' using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role then
    raise exception 'Modification du rôle interdite.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_profiles on public.profiles;
create trigger trg_proteger_profiles
  before insert or update on public.profiles
  for each row execute function public.proteger_profiles();

-- ---------- 2. VALIDATION : seul l'admin valide un pro / un labo ------------
create or replace function public.proteger_validation()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.est_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.valide_par_admin := false;
    new.motif_rejet := null;
    if tg_table_name = 'professionnels' then new.note_moyenne := 0; end if;
  else
    new.valide_par_admin := old.valide_par_admin;
    new.motif_rejet := old.motif_rejet;
    if tg_table_name = 'professionnels' then new.note_moyenne := old.note_moyenne; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_validation_pro on public.professionnels;
create trigger trg_proteger_validation_pro
  before insert or update on public.professionnels
  for each row execute function public.proteger_validation();

drop trigger if exists trg_proteger_validation_labo on public.laboratoires;
create trigger trg_proteger_validation_labo
  before insert or update on public.laboratoires
  for each row execute function public.proteger_validation();

-- ---------- 3. PAIEMENTS : on déclare, l'admin confirme ---------------------
create or replace function public.proteger_paiements()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.est_admin() then return new; end if;
  new.statut := 'en_attente';
  new.confirme_par := null;
  new.confirme_le := null;
  return new;
end;
$$;

drop trigger if exists trg_proteger_paiements on public.paiements;
create trigger trg_proteger_paiements
  before insert on public.paiements
  for each row execute function public.proteger_paiements();

-- Les labos : lecture de leur abonnement/paiements + déclaration de paiement
drop policy if exists "Labo voit son abonnement" on public.abonnements;
create policy "Labo voit son abonnement" on public.abonnements
  for select using (labo_id = auth.uid());

drop policy if exists "Labo voit ses paiements" on public.paiements;
create policy "Labo voit ses paiements" on public.paiements
  for select using (labo_id = auth.uid());

drop policy if exists "Labo declare un paiement manuel" on public.paiements;
create policy "Labo declare un paiement manuel" on public.paiements
  for insert with check (labo_id = auth.uid());

-- ---------- 4. PATIENTS : un pro ne voit que SES patients -------------------
drop policy if exists "Patient voit son propre dossier" on public.patients;
create policy "Patient voit son propre dossier" on public.patients
  for select using (
    id = auth.uid()
    or public.est_admin()
    or public.pro_suit_patient(patients.id, false)
    or public.labo_traite_patient(patients.id)
  );

-- ---------- 5. DOSSIER / DOCUMENTS : seulement après un RDV confirmé --------
drop policy if exists "Accès dossier médical" on public.dossiers_medicaux;
create policy "Accès dossier médical" on public.dossiers_medicaux
  for select using (
    patient_id = auth.uid()
    or public.est_admin()
    or public.pro_suit_patient(dossiers_medicaux.patient_id, true)
  );

drop policy if exists "Accès documents médicaux" on public.documents_medicaux;
create policy "Accès documents médicaux" on public.documents_medicaux
  for select using (
    patient_id = auth.uid()
    or public.est_admin()
    or public.pro_suit_patient(documents_medicaux.patient_id, true)
  );

-- ---------- 6. Écritures : seulement dans ce qui vous concerne -------------
drop policy if exists "Ajout de documents" on public.documents_medicaux;
create policy "Ajout de documents" on public.documents_medicaux
  for insert with check (
    patient_id = auth.uid()
    or (ajoute_par = auth.uid() and public.pro_suit_patient(patient_id, true))
  );

drop policy if exists "Pro crée ordonnance" on public.ordonnances;
create policy "Pro crée ordonnance" on public.ordonnances
  for insert with check (
    professionnel_id = auth.uid() and public.pro_suit_patient(patient_id, true)
  );

drop policy if exists "Envoi message" on public.messages;
create policy "Envoi message" on public.messages
  for insert with check (
    expediteur_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.patient_id = auth.uid() or c.professionnel_id = auth.uid())
    )
  );

drop policy if exists "Envoyer un message de collaboration" on public.messages_collaboration;
create policy "Envoyer un message de collaboration" on public.messages_collaboration
  for insert with check (
    expediteur_id = auth.uid()
    and exists (
      select 1 from public.conversations_collaboration c
      where c.id = messages_collaboration.conversation_id
      and (c.professionnel_a_id = auth.uid() or c.professionnel_b_id = auth.uid())
    )
  );

drop policy if exists "Envoyer un message labo" on public.messages_labo;
create policy "Envoyer un message labo" on public.messages_labo
  for insert with check (
    expediteur_id = auth.uid()
    and exists (
      select 1 from public.conversations_labo c
      where c.id = messages_labo.conversation_id
      and (c.labo_id = auth.uid() or c.demandeur_patient_id = auth.uid() or c.demandeur_professionnel_id = auth.uid())
    )
  );

-- Fichiers : mêmes restrictions que les tables (RDV confirmé/terminé)
drop policy if exists "lecture documents medicaux autorisee" on storage.objects;
create policy "lecture documents medicaux autorisee" on storage.objects
  for select using (
    bucket_id = 'documents-medicaux'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.pro_suit_patient(((storage.foldername(name))[1])::uuid, true)
      or public.est_admin()
    )
  );

drop policy if exists "televersement documents medicaux autorise" on storage.objects;
create policy "televersement documents medicaux autorise" on storage.objects
  for insert with check (
    bucket_id = 'documents-medicaux'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.pro_suit_patient(((storage.foldername(name))[1])::uuid, true)
    )
  );

drop policy if exists "lecture ordonnances autorisee" on storage.objects;
create policy "lecture ordonnances autorisee" on storage.objects
  for select using (
    bucket_id = 'ordonnances'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.pro_suit_patient(((storage.foldername(name))[1])::uuid, true)
      or public.est_admin()
    )
  );

drop policy if exists "televersement ordonnances autorise" on storage.objects;
create policy "televersement ordonnances autorise" on storage.objects
  for insert with check (
    bucket_id = 'ordonnances'
    and public.pro_suit_patient(((storage.foldername(name))[1])::uuid, true)
  );

-- ---------- 7. Statuts : pas de changement arbitraire -----------------------
create or replace function public.proteger_rendez_vous()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.est_admin() then return new; end if;

  -- Personne ne peut réattribuer un RDV à quelqu'un d'autre
  new.patient_id := old.patient_id;
  new.professionnel_id := old.professionnel_id;

  -- Le patient peut annuler ou demander un nouveau créneau (retour "en attente"),
  -- mais jamais se confirmer / terminer lui-même un rendez-vous.
  if auth.uid() = old.patient_id and new.statut is distinct from old.statut then
    if new.statut not in ('annule', 'en_attente') then
      raise exception 'Changement de statut non autorisé.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_rendez_vous on public.rendez_vous;
create trigger trg_proteger_rendez_vous
  before update on public.rendez_vous
  for each row execute function public.proteger_rendez_vous();

create or replace function public.proteger_demandes_analyse()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.est_admin() then return new; end if;

  new.labo_id := old.labo_id;
  new.demandeur_patient_id := old.demandeur_patient_id;
  new.demandeur_professionnel_id := old.demandeur_professionnel_id;

  -- Le demandeur (patient ou pro) ne peut qu'annuler : montant, délais,
  -- commentaire et résultat appartiennent au laboratoire.
  if auth.uid() <> old.labo_id then
    if new.statut is distinct from old.statut and new.statut <> 'annule' then
      raise exception 'Changement de statut non autorisé.' using errcode = '42501';
    end if;
    new.montant := old.montant;
    new.moyen_paiement := old.moyen_paiement;
    new.delai_heures := old.delai_heures;
    new.date_traitement_prevue := old.date_traitement_prevue;
    new.date_livraison_prevue := old.date_livraison_prevue;
    new.commentaire_labo := old.commentaire_labo;
    new.fichier_resultat := old.fichier_resultat;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_demandes_analyse on public.demandes_analyse;
create trigger trg_proteger_demandes_analyse
  before update on public.demandes_analyse
  for each row execute function public.proteger_demandes_analyse();

notify pgrst, 'reload schema';

-- =========================================================================
-- VÉRIFICATIONS (à lancer après, avec deux comptes de test) :
--  * Connecté en patient, dans la console du navigateur ou un test :
--      update profiles set role = 'admin' where id = auth.uid();  -> doit échouer
--  * Connecté en pro : select count(*) from patients;  -> seulement SES patients
--  * Votre propre compte admin se crée depuis le SQL Editor :
--      update profiles set role = 'admin' where email = 'vous@exemple.com';
-- =========================================================================
