-- =========================================================================
-- SANTÉ-CI — Mise à jour n°14 : notifications push (Android)
-- À exécuter une seule fois dans le SQL Editor Supabase (après la n°13).
-- =========================================================================

-- -------------------------------------------------------------------------
-- Jetons d'appareil (un utilisateur peut avoir plusieurs appareils).
-- -------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  utilisateur_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  plateforme text not null default 'android',
  created_at timestamptz not null default now(),
  unique (utilisateur_id, token)
);

alter table public.push_tokens enable row level security;

drop policy if exists "Gérer ses propres jetons push" on public.push_tokens;
create policy "Gérer ses propres jetons push" on public.push_tokens
  for all
  using (utilisateur_id = auth.uid())
  with check (utilisateur_id = auth.uid());

-- -------------------------------------------------------------------------
-- Suivi d'envoi des push, sur le même principe que sms_envoye/sms_tente_le.
-- -------------------------------------------------------------------------
alter table public.notifications
  add column if not exists push_envoye boolean not null default false,
  add column if not exists push_tente_le timestamptz;

create index if not exists idx_notifications_push_en_attente
  on public.notifications (created_at) where push_envoye = false;

-- =========================================================================
-- FIN DE LA MISE À JOUR N°14 — voir aussi GUIDE_PUSH.md pour la
-- configuration Firebase/FCM et le déploiement de l'Edge Function.
-- =========================================================================
