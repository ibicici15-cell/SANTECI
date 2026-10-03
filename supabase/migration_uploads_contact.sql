-- ============================================================
-- Agnini Sanfè — Migration : téléphone unique, upload de fichiers,
-- messages "Nous contacter"
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

-- ---------- Vérifier si un téléphone est déjà utilisé (agence OU voyageur) ----------
-- security definer : contourne volontairement la RLS de "travelers" (non
-- lisible publiquement) pour ce seul contrôle, sans jamais exposer les
-- autres données de la table.
create or replace function is_phone_taken(check_phone text)
returns boolean as $$
  select exists(select 1 from agencies where phone = check_phone)
      or exists(select 1 from travelers where phone = check_phone);
$$ language sql security definer stable;

grant execute on function is_phone_taken(text) to anon, authenticated;

-- ---------- Stockage : photos d'annonces (public) et documents de vérification (privés) ----------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

drop policy if exists "listing_photos_public_read" on storage.objects;
create policy "listing_photos_public_read" on storage.objects for select
  using (bucket_id = 'listing-photos');

drop policy if exists "listing_photos_owner_upload" on storage.objects;
create policy "listing_photos_owner_upload" on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.uid() is not null);

drop policy if exists "verification_docs_owner_upload" on storage.objects;
create policy "verification_docs_owner_upload" on storage.objects for insert
  with check (bucket_id = 'verification-docs' and auth.uid() is not null);

drop policy if exists "verification_docs_owner_read" on storage.objects;
create policy "verification_docs_owner_read" on storage.objects for select
  using (bucket_id = 'verification-docs' and (owner = auth.uid() or is_admin()));

-- ---------- Messages "Nous contacter" (footer -> boîte de réception admin) ----------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read')),
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

drop policy if exists "contact_messages_public_insert" on contact_messages;
create policy "contact_messages_public_insert" on contact_messages for insert with check (true);

drop policy if exists "contact_messages_admin_select" on contact_messages;
create policy "contact_messages_admin_select" on contact_messages for select using (is_admin());

drop policy if exists "contact_messages_admin_update" on contact_messages;
create policy "contact_messages_admin_update" on contact_messages for update using (is_admin());
