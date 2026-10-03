-- ============================================================
-- Agnini Sanfè — Correctif : quota gratuit 4 → 5 côté serveur
-- (le trigger était resté à 4 lors du précédent changement, seul le
-- chiffre côté frontend avait été mis à jour)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- ============================================================

create or replace function check_listing_quota()
returns trigger as $$
declare
  agency_plan text;
  current_count integer;
  max_allowed integer;
begin
  select plan, listings_count into agency_plan, current_count
  from agencies where id = new.agency_id;

  max_allowed := case agency_plan
    when 'unlimited' then 999999
    when 'standard' then 20
    else 5
  end;

  if current_count >= max_allowed then
    raise exception 'QUOTA_EXCEEDED';
  end if;

  return new;
end;
$$ language plpgsql security definer;
