-- ============================================================
-- Agnini Sanfè — Migration : comptes voyageurs
-- (profil, favoris, avis, messages/réponses d'agence)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter : IF NOT EXISTS / OR REPLACE partout)
-- ============================================================

-- ---------- Profils voyageurs ----------
create table if not exists travelers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  city text,
  created_at timestamptz not null default now()
);

alter table travelers enable row level security;

drop policy if exists "travelers_owner_read" on travelers;
create policy "travelers_owner_read" on travelers for select using (auth.uid() = id);

drop policy if exists "travelers_owner_insert" on travelers;
create policy "travelers_owner_insert" on travelers for insert with check (auth.uid() = id);

drop policy if exists "travelers_owner_update" on travelers;
create policy "travelers_owner_update" on travelers for update using (auth.uid() = id);

-- ---------- Favoris ----------
-- target_type: 'listing' | 'agency' | 'destination'
-- target_id  : uuid (en texte) pour listing/agency, nom libre pour destination
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references travelers(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'agency', 'destination')),
  target_id text not null,
  target_label text,
  created_at timestamptz not null default now(),
  unique (traveler_id, target_type, target_id)
);

alter table favorites enable row level security;

drop policy if exists "favorites_owner_all" on favorites;
create policy "favorites_owner_all" on favorites for all
  using (auth.uid() = traveler_id) with check (auth.uid() = traveler_id);

-- ---------- Avis : on les relie désormais à un compte voyageur ----------
alter table reviews add column if not exists traveler_id uuid references travelers(id) on delete set null;

-- Un seul avis par voyageur et par agence (il peut le modifier, pas le dupliquer)
do $$ begin
  alter table reviews add constraint reviews_one_per_traveler unique (agency_id, traveler_id);
exception when duplicate_object then null;
end $$;

drop policy if exists "reviews_public_insert" on reviews;
create policy "reviews_owner_insert" on reviews for insert with check (auth.uid() = traveler_id);

drop policy if exists "reviews_owner_update" on reviews;
create policy "reviews_owner_update" on reviews for update using (auth.uid() = traveler_id);

drop policy if exists "reviews_owner_delete" on reviews;
create policy "reviews_owner_delete" on reviews for delete using (auth.uid() = traveler_id);

-- Note moyenne + nombre d'avis mis en cache sur l'agence (évite de tout
-- ré-agréger à chaque affichage)
alter table agencies add column if not exists rating_avg numeric not null default 0;
alter table agencies add column if not exists review_count integer not null default 0;

create or replace function sync_agency_rating()
returns trigger as $$
declare
  target_agency_id uuid;
begin
  target_agency_id := coalesce(new.agency_id, old.agency_id);
  update agencies set
    review_count = (select count(*) from reviews where agency_id = target_agency_id),
    rating_avg = (select coalesce(round(avg(rating)::numeric, 1), 0) from reviews where agency_id = target_agency_id)
  where id = target_agency_id;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_agency_rating on reviews;
create trigger trg_sync_agency_rating
  after insert or update or delete on reviews
  for each row execute function sync_agency_rating();

-- ---------- Demandes : lien vers le compte voyageur + réponse d'agence ----------
alter table requests add column if not exists traveler_id uuid references travelers(id) on delete set null;
alter table requests add column if not exists agency_reply text;
alter table requests add column if not exists replied_at timestamptz;

drop policy if exists "requests_traveler_select" on requests;
create policy "requests_traveler_select" on requests for select using (auth.uid() = traveler_id);
