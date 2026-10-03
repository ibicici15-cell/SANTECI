-- ============================================================
-- Agnini Sanfè — Migration : admin élargi
-- (utilisateurs, vérifications, signalements, catégories/destinations)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

-- ---------- Admin peut lire tous les profils voyageurs ----------
drop policy if exists "travelers_admin_read" on travelers;
create policy "travelers_admin_read" on travelers for select using (is_admin());

-- ---------- Demandes de vérification d'agence ----------
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  message text,
  documents text[] default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_verification_agency on verification_requests(agency_id);

alter table verification_requests enable row level security;

drop policy if exists "verification_owner_insert" on verification_requests;
create policy "verification_owner_insert" on verification_requests for insert with check (auth.uid() = agency_id);

drop policy if exists "verification_owner_select" on verification_requests;
create policy "verification_owner_select" on verification_requests for select using (auth.uid() = agency_id);

drop policy if exists "verification_admin_select" on verification_requests;
create policy "verification_admin_select" on verification_requests for select using (is_admin());

drop policy if exists "verification_admin_update" on verification_requests;
create policy "verification_admin_update" on verification_requests for update using (is_admin());

-- ---------- Signalements ----------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references travelers(id) on delete set null,
  target_type text not null check (target_type in ('listing', 'agency')),
  target_id uuid not null,
  target_label text,
  reason text not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_reports_status on reports(status);

alter table reports enable row level security;

drop policy if exists "reports_public_insert" on reports;
create policy "reports_public_insert" on reports for insert with check (true);

drop policy if exists "reports_admin_select" on reports;
create policy "reports_admin_select" on reports for select using (is_admin());

drop policy if exists "reports_admin_update" on reports;
create policy "reports_admin_update" on reports for update using (is_admin());

-- ---------- Catégories de voyage (gérées par l'admin) ----------
create table if not exists categories (
  id text primary key,
  label text not null,
  sort_order integer not null default 0
);

alter table categories enable row level security;

drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read" on categories for select using (true);

drop policy if exists "categories_admin_write" on categories;
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

insert into categories (id, label, sort_order) values
  ('organise', 'Voyage organisé', 1),
  ('sejour', 'Séjour', 2),
  ('circuit', 'Circuit touristique', 3),
  ('excursion', 'Excursion', 4),
  ('groupe', 'Voyage en groupe', 5),
  ('affaires', 'Voyage d''affaires', 6),
  ('etudiant', 'Voyage étudiant', 7),
  ('noces', 'Voyage de noces', 8),
  ('pelerinage', 'Pèlerinage', 9),
  ('sejour_hotel', 'Séjour + hôtel', 10),
  ('visa', 'Visa + voyage', 11),
  ('autre', 'Autre service touristique', 12)
on conflict (id) do nothing;

-- ---------- Destinations (suggestions gérées par l'admin) ----------
create table if not exists destinations (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table destinations enable row level security;

drop policy if exists "destinations_public_read" on destinations;
create policy "destinations_public_read" on destinations for select using (true);

drop policy if exists "destinations_admin_write" on destinations;
create policy "destinations_admin_write" on destinations for all using (is_admin()) with check (is_admin());

insert into destinations (name) values
  ('Sénégal'), ('Ghana'), ('Maroc'), ('Tunisie'), ('Égypte'), ('Afrique du Sud'),
  ('Nigeria'), ('Cameroun'), ('Mali'), ('Guinée'), ('Bénin'), ('Togo'),
  ('Burkina Faso'), ('Kenya'), ('Rwanda'), ('Gabon'), ('RD Congo'),
  ('Dubaï'), ('Abou Dabi'), ('Arabie Saoudite'), ('Qatar'), ('Turquie'), ('Liban'),
  ('France'), ('Belgique'), ('Espagne'), ('Italie'), ('Portugal'), ('Allemagne'),
  ('Royaume-Uni'), ('Suisse'), ('Pays-Bas'), ('Grèce'),
  ('États-Unis'), ('Canada'), ('Brésil'),
  ('Chine'), ('Inde'), ('Thaïlande'), ('Malaisie'), ('Indonésie'), ('Japon')
on conflict (name) do nothing;
