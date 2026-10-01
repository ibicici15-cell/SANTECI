-- =========================================================================
-- SANTÉ-CI — Mise à jour n°11
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°10).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) Confirmation de paiement admin : "invalid input value for enum
--    statut_abonnement: """
-- La fonction notifier_activation_abonnement (introduite en v10) comparait
-- l'ancien statut avec `coalesce(old.statut, '')`. Comme la colonne
-- "statut" est un enum (statut_abonnement), Postgres tente de caster la
-- chaîne vide '' vers ce type pour unifier le COALESCE, ce qui échoue --
-- exactement l'erreur remontée. Corrigé en comparant directement, sans
-- caster de chaîne vide vers l'enum.
-- -------------------------------------------------------------------------
create or replace function public.notifier_activation_abonnement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'actif' and (old.statut is null or old.statut <> 'actif') then
    if new.professionnel_id is not null then
      insert into public.notifications (destinataire_id, type, titre, contenu, lien)
      values (new.professionnel_id, 'rappel_abonnement', 'Abonnement activé', 'Votre paiement a été confirmé, votre abonnement est actif.', '/professionnel/abonnement');
    elsif new.labo_id is not null then
      insert into public.notifications (destinataire_id, type, titre, contenu, lien)
      values (new.labo_id, 'rappel_abonnement', 'Abonnement activé', 'Votre paiement a été confirmé, votre abonnement est actif.', '/laboratoire/abonnement');
    end if;
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 2) "infinite recursion detected in policy for relation
--    demandes_collaboration"
-- Les politiques RLS de demandes_collaboration et destinataires_collaboration
-- se référençaient mutuellement via des sous-requêtes EXISTS directes sur
-- l'autre table protégée par RLS : lire demandes_collaboration évalue sa
-- politique, qui interroge destinataires_collaboration, dont la politique
-- interroge à son tour demandes_collaboration, etc. — boucle infinie.
-- On casse la boucle avec des fonctions SECURITY DEFINER (qui contournent
-- RLS, le propriétaire de la table étant exempté par défaut) : c'est le
-- correctif standard recommandé par Supabase pour ce cas de figure.
-- -------------------------------------------------------------------------
create or replace function public.est_demandeur_de(p_demande_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.demandes_collaboration
    where id = p_demande_id and demandeur_id = auth.uid()
  );
$$;

create or replace function public.est_destinataire_de(p_demande_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.destinataires_collaboration
    where demande_id = p_demande_id and professionnel_id = auth.uid()
  );
$$;

drop policy if exists "Voir ses demandes de collaboration" on public.demandes_collaboration;
create policy "Voir ses demandes de collaboration" on public.demandes_collaboration
  for select using (
    demandeur_id = auth.uid()
    or public.est_destinataire_de(id)
    or public.mon_role() = 'admin'
  );

drop policy if exists "Voir les destinataires concernes" on public.destinataires_collaboration;
create policy "Voir les destinataires concernes" on public.destinataires_collaboration
  for select using (
    professionnel_id = auth.uid()
    or public.est_demandeur_de(demande_id)
  );

drop policy if exists "Demandeur ajoute des destinataires" on public.destinataires_collaboration;
create policy "Demandeur ajoute des destinataires" on public.destinataires_collaboration
  for insert with check (
    public.est_demandeur_de(demande_id)
  );

-- -------------------------------------------------------------------------
-- 3) Le patient peut désormais sélectionner et supprimer ses
--    comptes-rendus depuis "Mes comptes-rendus" (l'ordonnance liée, si
--    elle existe, est supprimée avec — "on delete cascade" sur
--    ordonnances.consultation_id).
-- -------------------------------------------------------------------------
drop policy if exists "Patient supprime son compte-rendu" on public.consultations;
create policy "Patient supprime son compte-rendu" on public.consultations
  for delete using (
    exists (
      select 1 from public.rendez_vous r
      where r.id = consultations.rendez_vous_id and r.patient_id = auth.uid()
    )
  );

-- =========================================================================
-- FIN DE LA MISE À JOUR N°11
-- =========================================================================
