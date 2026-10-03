-- ============================================================
-- Agnini Sanfè — Migration : blocage voyageurs, mise en avant admin
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

alter table travelers add column if not exists blocked boolean not null default false;

-- L'admin doit pouvoir modifier le statut "blocked" (en plus de la
-- policy "propriétaire" déjà en place, qui ne couvre pas ce cas).
drop policy if exists "travelers_admin_update" on travelers;
create policy "travelers_admin_update" on travelers for update using (is_admin());

-- boost_source accepte désormais aussi 'admin' (mise en avant gratuite
-- décidée par l'administrateur, indépendante des boosts payants/gratuits
-- de plan).
alter table listings drop constraint if exists listings_boost_source_check;
alter table listings add constraint listings_boost_source_check
  check (boost_source in ('free_plan', 'paid', 'admin'));
