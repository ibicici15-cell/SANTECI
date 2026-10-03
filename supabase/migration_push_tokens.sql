-- ============================================================
-- Agnini Sanfè — Migration : jetons des appareils (notifications push)
-- À exécuter dans Supabase → SQL Editor → New query → Run
-- (Sûr à ré-exécuter)
-- ============================================================

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_tokens_user on device_tokens(user_id);

alter table device_tokens enable row level security;

drop policy if exists "device_tokens_owner_select" on device_tokens;
create policy "device_tokens_owner_select" on device_tokens for select using (auth.uid() = user_id);

-- Pas d'écriture directe : tout passe par les fonctions ci-dessous, pour
-- qu'un téléphone qui change de compte reprenne bien son jeton.

-- Associe (ou ré-associe) le jeton de cet appareil au compte connecté.
create or replace function register_device_token(p_token text, p_platform text default 'android')
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into device_tokens (user_id, token, platform, updated_at)
  values (auth.uid(), p_token, coalesce(p_platform, 'android'), now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$ language plpgsql security definer set search_path = public;

-- Retire le jeton (déconnexion) : l'appareil ne reçoit plus les push de ce compte.
create or replace function unregister_device_token(p_token text)
returns void as $$
begin
  delete from device_tokens where token = p_token and user_id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function register_device_token(text, text) to authenticated;
grant execute on function unregister_device_token(text) to authenticated;
