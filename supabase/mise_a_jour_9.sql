-- =========================================================================
-- SANTÉ-CI — Mise à jour n°9
-- À exécuter une seule fois dans le SQL Editor Supabase.
-- =========================================================================

-- La recherche de confrères n'impose plus de filtrer par spécialité avant
-- d'envoyer une demande (l'utilisateur peut sélectionner parmi tous les
-- confrères éligibles) : cette colonne devient facultative.
alter table public.demandes_collaboration
  alter column specialite_recherchee drop not null;

-- =========================================================================
-- FIN DE LA MISE À JOUR N°9
-- =========================================================================
