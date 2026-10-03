-- ============================================================
-- Agnini Sanfè — Migration : séparation Billets / Voyages
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

alter table listings add column if not exists offer_type text not null default 'voyage';

do $$ begin
  alter table listings add constraint listings_offer_type_check check (offer_type in ('billet', 'voyage'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_listings_offer_type on listings(offer_type);
