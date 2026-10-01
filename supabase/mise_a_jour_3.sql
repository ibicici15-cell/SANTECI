-- =========================================================================
-- SANTÉ-CI — Mise à jour n°3
-- À exécuter une seule fois dans le SQL Editor Supabase (après les mises à
-- jour précédentes : correctif_triggers_rls.sql, mise_a_jour_2.sql).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Si le rôle d'un compte change (ex : un admin transforme un compte
--    professionnel en compte admin), sa fiche professionnelle perd
--    automatiquement sa validation et disparaît donc des recherches —
--    sans avoir besoin d'exposer la table "profiles" publiquement.
-- -------------------------------------------------------------------------
create or replace function public.revoquer_validation_si_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> 'professionnel' and old.role = 'professionnel' then
    update public.professionnels set valide_par_admin = false, actif = false where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_revoquer_validation_role on public.profiles;
create trigger trg_revoquer_validation_role
after update of role on public.profiles
for each row execute function public.revoquer_validation_si_role_change();

-- -------------------------------------------------------------------------
-- 2. PAIEMENT MANUEL PAR TRANSFERT MOBILE MONEY (alternative à CinetPay)
--    Le professionnel déclare avoir transféré le montant de son abonnement
--    vers le numéro Mobile Money de la plateforme, depuis SON PROPRE numéro
--    (celui renseigné dans son profil). L'admin vérifie la réception réelle
--    du transfert puis confirme manuellement pour activer l'abonnement.
-- -------------------------------------------------------------------------
alter table public.paiements
  add column if not exists telephone_emetteur text,
  add column if not exists plan text,
  add column if not exists confirme_par uuid references public.profiles(id),
  add column if not exists confirme_le timestamptz;

create policy "Pro declare un paiement manuel pour son abonnement"
on public.paiements for insert
with check (professionnel_id = auth.uid());

create policy "Admin confirme les paiements"
on public.paiements for update
using (public.mon_role() = 'admin');

-- =========================================================================
-- FIN DE LA MISE À JOUR N°3
-- =========================================================================
