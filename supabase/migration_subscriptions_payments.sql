-- ============================================================
-- Agnini Sanfè — Migration : abonnements, paiements, boosts
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

-- ---------- Renommage du plan "unlimited" -> "premium" ----------
-- (50 annonces, ce n'est plus vraiment "illimité")
alter table agencies drop constraint if exists agencies_plan_check;
update agencies set plan = 'premium' where plan = 'unlimited';
alter table agencies add constraint agencies_plan_check check (plan in ('free', 'standard', 'premium'));

alter table agencies add column if not exists plan_started_at timestamptz not null default now();

-- ---------- Boosts : d'où vient un boost actif ----------
alter table listings add column if not exists boost_source text check (boost_source in ('free_plan', 'paid'));

-- ---------- Paiements manuels (abonnement ou boost) ----------
create table if not exists subscription_payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  type text not null check (type in ('subscription', 'boost')),
  plan text check (plan in ('standard', 'premium')),
  listing_id uuid references listings(id) on delete cascade,
  boost_duration_days integer,
  amount integer not null,
  payment_method text not null check (payment_method in ('orange', 'mtn', 'wave')),
  reference text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_payments_agency on subscription_payments(agency_id);
create index if not exists idx_payments_status on subscription_payments(status);

alter table subscription_payments enable row level security;

drop policy if exists "payments_owner_insert" on subscription_payments;
create policy "payments_owner_insert" on subscription_payments for insert with check (auth.uid() = agency_id);

drop policy if exists "payments_owner_select" on subscription_payments;
create policy "payments_owner_select" on subscription_payments for select using (auth.uid() = agency_id);

drop policy if exists "payments_admin_select" on subscription_payments;
create policy "payments_admin_select" on subscription_payments for select using (is_admin());

drop policy if exists "payments_admin_update" on subscription_payments;
create policy "payments_admin_update" on subscription_payments for update using (is_admin());

-- ============================================================
-- Quota d'annonces : recalculé au mois en cours (5 gratuites de base +
-- allocation du plan, se renouvelle chaque mois calendaire)
-- ============================================================

create or replace function check_listing_quota()
returns trigger as $$
declare
  agency_plan text;
  plan_allowance integer;
  base_free integer := 5;
  month_count integer;
begin
  select plan into agency_plan from agencies where id = new.agency_id;

  plan_allowance := case agency_plan
    when 'premium' then 50
    when 'standard' then 20
    else 0
  end;

  select count(*) into month_count from listings
    where agency_id = new.agency_id and created_at >= date_trunc('month', now());

  if month_count >= (base_free + plan_allowance) then
    raise exception 'QUOTA_EXCEEDED';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Boost gratuit automatique sur les N premières annonces du mois
-- (5 pour Standard, 10 pour Premium) — l'agence ne choisit pas
-- lesquelles, c'est automatique à la publication.
-- ============================================================

create or replace function auto_boost_new_listing()
returns trigger as $$
declare
  agency_plan text;
  free_boost_allowance integer;
  already_boosted_this_month integer;
begin
  select plan into agency_plan from agencies where id = new.agency_id;

  free_boost_allowance := case agency_plan
    when 'premium' then 10
    when 'standard' then 5
    else 0
  end;

  if free_boost_allowance > 0 then
    select count(*) into already_boosted_this_month from listings
      where agency_id = new.agency_id
        and boost_source = 'free_plan'
        and created_at >= date_trunc('month', now());

    if already_boosted_this_month < free_boost_allowance then
      new.boosted := true;
      new.boost_source := 'free_plan';
      new.boost_expires_at := now() + interval '30 days';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_auto_boost_new_listing on listings;
create trigger trg_auto_boost_new_listing
  before insert on listings
  for each row execute function auto_boost_new_listing();
