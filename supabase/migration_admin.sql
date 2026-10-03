-- ============================================================
-- Karavan / Agnini Sanfè — Migration : espace Administration
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter : utilise IF NOT EXISTS / OR REPLACE partout)
-- ============================================================

-- ---------- Table des administrateurs ----------
-- Un admin est un utilisateur Supabase Auth référencé ici. Il n'y a
-- volontairement PAS d'inscription admin depuis l'app : on ajoute un
-- admin à la main depuis le SQL Editor (voir README, section Admin).
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

drop policy if exists "admins_self_read" on admins;
create policy "admins_self_read" on admins for select using (auth.uid() = id);

-- ---------- Fonction utilitaire : l'utilisateur courant est-il admin ? ----------
create or replace function is_admin()
returns boolean as $$
  select exists(select 1 from admins where id = auth.uid());
$$ language sql security definer stable;

-- ---------- Suspension d'agence (modération) ----------
alter table agencies add column if not exists suspended boolean not null default false;

-- Quand une agence est suspendue, ses annonces actives passent en pause
-- automatiquement (elles redeviennent activables manuellement si l'agence
-- est réhabilitée).
create or replace function cascade_agency_suspension()
returns trigger as $$
begin
  if new.suspended = true and (old.suspended is distinct from true) then
    update listings set status = 'paused' where agency_id = new.id and status = 'active';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_cascade_agency_suspension on agencies;
create trigger trg_cascade_agency_suspension
  after update of suspended on agencies
  for each row execute function cascade_agency_suspension();

-- ---------- Droits étendus pour les admins ----------
-- (s'ajoutent aux policies "propriétaire" déjà en place — Postgres les
-- combine avec OR : une ligne est modifiable si l'une des deux conditions
-- est vraie)

drop policy if exists "agencies_admin_update" on agencies;
create policy "agencies_admin_update" on agencies for update using (is_admin());

drop policy if exists "listings_admin_update" on listings;
create policy "listings_admin_update" on listings for update using (is_admin());

drop policy if exists "listings_admin_delete" on listings;
create policy "listings_admin_delete" on listings for delete using (is_admin());

drop policy if exists "requests_admin_select" on requests;
create policy "requests_admin_select" on requests for select using (is_admin());
