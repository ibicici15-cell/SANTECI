-- =========================================================================
-- SANTÉ-CI — Mise à jour n°7
-- Collaboration entre professionnels + nouveau rôle "laboratoire"
-- À exécuter une seule fois dans le SQL Editor Supabase.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. Nouveau rôle "laboratoire"
-- -------------------------------------------------------------------------
alter type user_role add value if not exists 'laboratoire';

-- =========================================================================
-- PARTIE A — COLLABORATION ENTRE PROFESSIONNELS
-- =========================================================================

create type urgence_collaboration as enum ('normal', 'urgent', 'tres_urgent');
create type statut_collaboration as enum ('ouverte', 'resolue', 'expiree', 'annulee');
create type statut_destinataire_collab as enum ('en_attente', 'acceptee', 'refusee', 'ignoree_resolue');

alter table public.professionnels
  add column if not exists accepte_collaborations boolean not null default false;

create table public.demandes_collaboration (
  id uuid primary key default uuid_generate_v4(),
  demandeur_id uuid not null references public.professionnels(id) on delete cascade,
  specialite_recherchee text,
  ville_recherchee text,
  description text not null,
  urgence urgence_collaboration not null default 'normal',
  statut statut_collaboration not null default 'ouverte',
  professionnel_retenu_id uuid references public.professionnels(id),
  date_expiration timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table public.destinataires_collaboration (
  id uuid primary key default uuid_generate_v4(),
  demande_id uuid not null references public.demandes_collaboration(id) on delete cascade,
  professionnel_id uuid not null references public.professionnels(id) on delete cascade,
  statut statut_destinataire_collab not null default 'en_attente',
  repondu_le timestamptz,
  created_at timestamptz not null default now(),
  unique (demande_id, professionnel_id)
);

create table public.conversations_collaboration (
  id uuid primary key default uuid_generate_v4(),
  demande_id uuid not null references public.demandes_collaboration(id) on delete cascade,
  professionnel_a_id uuid not null references public.professionnels(id) on delete cascade, -- le demandeur
  professionnel_b_id uuid not null references public.professionnels(id) on delete cascade, -- le confrère retenu
  created_at timestamptz not null default now(),
  unique (demande_id)
);

create table public.messages_collaboration (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations_collaboration(id) on delete cascade,
  expediteur_id uuid not null references public.professionnels(id),
  contenu text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- Le demandeur choisit avec quel confrère il continue : les autres
-- destinataires (qu'ils aient accepté, refusé, ou pas encore répondu) sont
-- automatiquement marqués "résolue ailleurs" et reçoivent un message
-- courtois. Une conversation dédiée s'ouvre avec le confrère retenu.
create or replace function public.resoudre_collaboration(p_demande_id uuid, p_professionnel_retenu_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demandeur_id uuid;
begin
  select demandeur_id into v_demandeur_id from public.demandes_collaboration where id = p_demande_id;

  if v_demandeur_id is null then
    raise exception 'Demande introuvable';
  end if;
  if v_demandeur_id <> auth.uid() then
    raise exception 'Non autorisé';
  end if;

  update public.demandes_collaboration
  set statut = 'resolue', professionnel_retenu_id = p_professionnel_retenu_id
  where id = p_demande_id;

  update public.destinataires_collaboration
  set statut = 'ignoree_resolue', repondu_le = now()
  where demande_id = p_demande_id and professionnel_id <> p_professionnel_retenu_id
    and statut <> 'ignoree_resolue';

  insert into public.notifications (destinataire_id, type, titre, contenu)
  select professionnel_id, 'confirmation_rdv', 'Demande déjà résolue',
         'Cette demande de collaboration a été résolue avec un autre confrère. Merci pour votre disponibilité.'
  from public.destinataires_collaboration
  where demande_id = p_demande_id and professionnel_id <> p_professionnel_retenu_id;

  insert into public.conversations_collaboration (demande_id, professionnel_a_id, professionnel_b_id)
  values (p_demande_id, v_demandeur_id, p_professionnel_retenu_id)
  on conflict (demande_id) do nothing;

  insert into public.notifications (destinataire_id, type, titre, contenu)
  values (p_professionnel_retenu_id, 'confirmation_rdv', 'Collaboration confirmée',
          'Un confrère continue avec vous sur sa demande de collaboration. Consultez la messagerie confrères.');
end;
$$;

grant execute on function public.resoudre_collaboration(uuid, uuid) to authenticated;

-- Fait expirer automatiquement les demandes non résolues après 7 jours.
create or replace function public.expirer_collaborations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.demandes_collaboration
  set statut = 'expiree'
  where statut = 'ouverte' and date_expiration < now();
end;
$$;

-- RLS collaboration
alter table public.demandes_collaboration enable row level security;
alter table public.destinataires_collaboration enable row level security;
alter table public.conversations_collaboration enable row level security;
alter table public.messages_collaboration enable row level security;

create policy "Voir ses demandes de collaboration" on public.demandes_collaboration
  for select using (
    demandeur_id = auth.uid()
    or exists (select 1 from public.destinataires_collaboration d where d.demande_id = demandes_collaboration.id and d.professionnel_id = auth.uid())
    or public.mon_role() = 'admin'
  );
create policy "Creer une demande de collaboration" on public.demandes_collaboration
  for insert with check (
    demandeur_id = auth.uid()
    and exists (select 1 from public.professionnels p where p.id = auth.uid() and p.valide_par_admin = true)
  );
create policy "Demandeur annule sa demande" on public.demandes_collaboration
  for update using (demandeur_id = auth.uid());

create policy "Voir les destinataires concernes" on public.destinataires_collaboration
  for select using (
    professionnel_id = auth.uid()
    or exists (select 1 from public.demandes_collaboration dc where dc.id = destinataires_collaboration.demande_id and dc.demandeur_id = auth.uid())
  );
create policy "Demandeur ajoute des destinataires" on public.destinataires_collaboration
  for insert with check (
    exists (select 1 from public.demandes_collaboration dc where dc.id = demande_id and dc.demandeur_id = auth.uid())
  );
create policy "Destinataire repond" on public.destinataires_collaboration
  for update using (professionnel_id = auth.uid() and statut = 'en_attente');

create policy "Voir ses conversations de collaboration" on public.conversations_collaboration
  for select using (professionnel_a_id = auth.uid() or professionnel_b_id = auth.uid());

create policy "Voir ses messages de collaboration" on public.messages_collaboration
  for select using (
    exists (
      select 1 from public.conversations_collaboration c
      where c.id = messages_collaboration.conversation_id
      and (c.professionnel_a_id = auth.uid() or c.professionnel_b_id = auth.uid())
    )
  );
create policy "Envoyer un message de collaboration" on public.messages_collaboration
  for insert with check (expediteur_id = auth.uid());
create policy "Marquer message collaboration lu" on public.messages_collaboration
  for update using (
    exists (
      select 1 from public.conversations_collaboration c
      where c.id = messages_collaboration.conversation_id
      and (c.professionnel_a_id = auth.uid() or c.professionnel_b_id = auth.uid())
    )
  );

-- =========================================================================
-- PARTIE B — LABORATOIRES
-- =========================================================================

create type statut_analyse as enum ('en_attente', 'confirme', 'refuse', 'termine', 'annule');

create table public.laboratoires (
  id uuid primary key references public.profiles(id) on delete cascade,
  nom text not null,
  ville text not null,
  pays text default 'Côte d''Ivoire',
  adresse text,
  logo_url text,
  description text,
  moyens_paiement text[] default array[]::text[],
  actif boolean not null default true,
  valide_par_admin boolean not null default false,
  document_justificatif_url text,
  motif_rejet text,
  created_at timestamptz not null default now()
);

create index idx_laboratoires_ville on public.laboratoires(ville);

-- Jours d'ouverture (équivalent des horaires de disponibilité)
create table public.jours_ouverture_labo (
  id uuid primary key default uuid_generate_v4(),
  labo_id uuid not null references public.laboratoires(id) on delete cascade,
  jour_semaine int not null check (jour_semaine between 0 and 6),
  heure_debut time not null,
  heure_fin time not null
);

-- Catalogue de prestations (facultatif, mais indispensable pour apparaître
-- dans les recherches filtrées par type d'analyse)
create table public.prestations_labo (
  id uuid primary key default uuid_generate_v4(),
  labo_id uuid not null references public.laboratoires(id) on delete cascade,
  nom_analyse text not null,
  prix numeric(12,0),
  moyens_paiement text[] default array[]::text[],
  mode_retrait text not null default 'sur_place', -- 'sur_place' | 'en_ligne'
  delai_heures int, -- délai de traitement typique, en heures
  description text,
  created_at timestamptz not null default now()
);

create index idx_prestations_labo_nom on public.prestations_labo(nom_analyse);

-- Demandes d'analyse (le demandeur est SOIT un patient SOIT un professionnel)
create table public.demandes_analyse (
  id uuid primary key default uuid_generate_v4(),
  labo_id uuid not null references public.laboratoires(id) on delete cascade,
  demandeur_patient_id uuid references public.patients(id) on delete cascade,
  demandeur_professionnel_id uuid references public.professionnels(id) on delete cascade,
  prestation_id uuid references public.prestations_labo(id) on delete set null,
  description text, -- texte libre (devis) ou précision complémentaire
  statut statut_analyse not null default 'en_attente',
  montant numeric(12,0),
  moyen_paiement text,
  mode_retrait text,
  delai_heures int,
  date_traitement_prevue timestamptz,
  date_livraison_prevue timestamptz,
  commentaire_labo text,
  fichier_resultat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (demandeur_patient_id is not null or demandeur_professionnel_id is not null)
);

create index idx_demandes_analyse_labo on public.demandes_analyse(labo_id);

create trigger trg_demandes_analyse_updated_at
before update on public.demandes_analyse
for each row execute function public.set_updated_at();

-- Messagerie labo <-> demandeur
create table public.conversations_labo (
  id uuid primary key default uuid_generate_v4(),
  labo_id uuid not null references public.laboratoires(id) on delete cascade,
  demandeur_patient_id uuid references public.patients(id) on delete cascade,
  demandeur_professionnel_id uuid references public.professionnels(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (demandeur_patient_id is not null or demandeur_professionnel_id is not null)
);

create unique index uq_conv_labo_patient on public.conversations_labo(labo_id, demandeur_patient_id) where demandeur_patient_id is not null;
create unique index uq_conv_labo_pro on public.conversations_labo(labo_id, demandeur_professionnel_id) where demandeur_professionnel_id is not null;

create table public.messages_labo (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations_labo(id) on delete cascade,
  expediteur_id uuid not null references public.profiles(id),
  contenu text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- Les labos suivent le même modèle d'abonnement que les professionnels
alter table public.abonnements
  add column if not exists labo_id uuid references public.laboratoires(id) on delete cascade;
alter table public.abonnements drop constraint if exists abonnements_check;
alter table public.abonnements add constraint abonnements_check
  check (professionnel_id is not null or etablissement_id is not null or labo_id is not null);

alter table public.paiements
  add column if not exists labo_id uuid references public.laboratoires(id) on delete cascade;

-- Essai gratuit d'un mois à l'inscription d'un labo (même logique que les pros)
create or replace function public.creer_essai_gratuit_labo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.abonnements (labo_id, statut, date_debut_essai, date_fin_essai)
  values (new.id, 'essai', now(), now() + interval '1 month');
  return new;
end;
$$;

create trigger trg_creer_essai_labo
after insert on public.laboratoires
for each row execute function public.creer_essai_gratuit_labo();

-- Notification automatique à la création d'une demande d'analyse
create or replace function public.notifier_nouvelle_demande_analyse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, contenu)
  values (new.labo_id, 'confirmation_rdv', 'Nouvelle demande d''analyse', 'Un demandeur a soumis une nouvelle demande.');
  return new;
end;
$$;

create trigger trg_notifier_nouvelle_demande_analyse
after insert on public.demandes_analyse
for each row execute function public.notifier_nouvelle_demande_analyse();

-- Notification automatique quand le labo répond (confirme/refuse) ou livre un résultat
create or replace function public.notifier_reponse_analyse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destinataire uuid;
begin
  v_destinataire := coalesce(new.demandeur_professionnel_id, new.demandeur_patient_id);

  if new.statut <> old.statut and new.statut = 'confirme' then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (v_destinataire, 'confirmation_rdv', 'Demande d''analyse confirmée', 'Le laboratoire a confirmé votre demande.');
  elsif new.statut <> old.statut and new.statut = 'refuse' then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (v_destinataire, 'confirmation_rdv', 'Demande d''analyse refusée', 'Le laboratoire ne peut pas traiter cette demande.');
  elsif new.fichier_resultat is not null and old.fichier_resultat is null then
    insert into public.notifications (destinataire_id, type, titre, contenu)
    values (v_destinataire, 'document_disponible', 'Résultat disponible', 'Le laboratoire a transmis le résultat de votre analyse.');
  end if;
  return new;
end;
$$;

create trigger trg_notifier_reponse_analyse
after update on public.demandes_analyse
for each row execute function public.notifier_reponse_analyse();

-- RLS laboratoires
alter table public.laboratoires enable row level security;
alter table public.jours_ouverture_labo enable row level security;
alter table public.prestations_labo enable row level security;
alter table public.demandes_analyse enable row level security;
alter table public.conversations_labo enable row level security;
alter table public.messages_labo enable row level security;

create policy "Lecture publique laboratoires" on public.laboratoires for select using (true);
create policy "Labo modifie son profil" on public.laboratoires for update using (id = auth.uid());
create policy "Labo cree son profil" on public.laboratoires for insert with check (id = auth.uid());
create policy "Admin gere les laboratoires" on public.laboratoires for update using (public.mon_role() = 'admin');

create policy "Lecture publique jours ouverture" on public.jours_ouverture_labo for select using (true);
create policy "Labo gere ses jours ouverture" on public.jours_ouverture_labo
  for all using (labo_id = auth.uid()) with check (labo_id = auth.uid());

create policy "Lecture publique prestations" on public.prestations_labo for select using (true);
create policy "Labo gere ses prestations" on public.prestations_labo
  for all using (labo_id = auth.uid()) with check (labo_id = auth.uid());

create policy "Voir ses demandes d'analyse" on public.demandes_analyse
  for select using (
    demandeur_patient_id = auth.uid() or demandeur_professionnel_id = auth.uid()
    or labo_id = auth.uid() or public.mon_role() = 'admin'
  );
create policy "Creer une demande d'analyse" on public.demandes_analyse
  for insert with check (demandeur_patient_id = auth.uid() or demandeur_professionnel_id = auth.uid());
create policy "Mise a jour demande d'analyse" on public.demandes_analyse
  for update using (
    demandeur_patient_id = auth.uid() or demandeur_professionnel_id = auth.uid() or labo_id = auth.uid()
  );

create policy "Voir ses conversations labo" on public.conversations_labo
  for select using (
    labo_id = auth.uid() or demandeur_patient_id = auth.uid() or demandeur_professionnel_id = auth.uid()
  );
create policy "Creer une conversation labo" on public.conversations_labo
  for insert with check (
    labo_id = auth.uid() or demandeur_patient_id = auth.uid() or demandeur_professionnel_id = auth.uid()
  );

create policy "Voir ses messages labo" on public.messages_labo
  for select using (
    exists (
      select 1 from public.conversations_labo c
      where c.id = messages_labo.conversation_id
      and (c.labo_id = auth.uid() or c.demandeur_patient_id = auth.uid() or c.demandeur_professionnel_id = auth.uid())
    )
  );
create policy "Envoyer un message labo" on public.messages_labo
  for insert with check (expediteur_id = auth.uid());
create policy "Marquer message labo lu" on public.messages_labo
  for update using (
    exists (
      select 1 from public.conversations_labo c
      where c.id = messages_labo.conversation_id
      and (c.labo_id = auth.uid() or c.demandeur_patient_id = auth.uid() or c.demandeur_professionnel_id = auth.uid())
    )
  );

-- Buckets de stockage : justificatif labo (réutilise le même bucket privé
-- que les professionnels) + résultats d'analyse
insert into storage.buckets (id, name, public)
values ('resultats-analyses', 'resultats-analyses', false)
on conflict (id) do nothing;

create policy "pro/labo televerse un resultat"
on storage.objects for insert
with check (
  bucket_id = 'resultats-analyses'
  and exists (
    select 1 from public.demandes_analyse d
    where d.id::text = (storage.foldername(name))[1]
    and d.labo_id = auth.uid()
  )
);

create policy "lecture resultat par le demandeur ou le labo"
on storage.objects for select
using (
  bucket_id = 'resultats-analyses'
  and exists (
    select 1 from public.demandes_analyse d
    where d.id::text = (storage.foldername(name))[1]
    and (d.labo_id = auth.uid() or d.demandeur_patient_id = auth.uid() or d.demandeur_professionnel_id = auth.uid())
  )
);

-- Note : le bucket "verification-professionnels" (justificatif) est déjà
-- couvert par les politiques génériques de storage.sql (basées sur
-- auth.uid() = dossier), qui s'appliquent aussi bien aux professionnels
-- qu'aux laboratoires — aucune politique supplémentaire n'est nécessaire ici.

notify pgrst, 'reload schema';

-- =========================================================================
-- FIN DE LA MISE À JOUR N°7
-- =========================================================================
