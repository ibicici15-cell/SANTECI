-- =========================================================================
-- SANTÉ-CI — Mise à jour n°4
-- À exécuter une seule fois dans le SQL Editor Supabase (après les mises à
-- jour précédentes).
-- =========================================================================

-- -------------------------------------------------------------------------
-- BUG CORRIGÉ : un patient ne peut voir, via la RLS, que SES PROPRES
-- rendez-vous (patient_id = auth.uid()). Résultat : la page de réservation
-- ne détectait jamais qu'un créneau était déjà demandé par un AUTRE
-- patient, et le laissait sélectionnable.
--
-- Solution : une fonction dédiée, exécutée avec des droits élevés
-- (SECURITY DEFINER), qui renvoie UNIQUEMENT les horodatages déjà pris
-- pour un professionnel donné — sans exposer qui a réservé, ni aucune
-- autre donnée du rendez-vous.
-- -------------------------------------------------------------------------
create or replace function public.creneaux_pris(p_professionnel_id uuid, p_debut timestamptz, p_fin timestamptz)
returns table(date_heure timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.date_heure
  from public.rendez_vous r
  where r.professionnel_id = p_professionnel_id
    and r.statut in ('en_attente', 'confirme')
    and r.date_heure >= p_debut
    and r.date_heure <= p_fin;
$$;

grant execute on function public.creneaux_pris(uuid, timestamptz, timestamptz) to anon, authenticated;

-- Force PostgREST à recharger son cache de schéma pour qu'il connaisse
-- immédiatement cette nouvelle fonction (sinon l'appel RPC échoue parfois
-- pendant quelques minutes après la création, le temps que le cache se
-- rafraîchisse automatiquement).
notify pgrst, 'reload schema';

-- =========================================================================
-- FIN DE LA MISE À JOUR N°4
-- =========================================================================
