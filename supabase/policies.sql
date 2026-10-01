-- =========================================================================
-- SANTÉ-CI — Politiques de sécurité (Row Level Security)
-- À exécuter APRÈS schema.sql
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.dossiers_medicaux enable row level security;
alter table public.documents_medicaux enable row level security;
alter table public.etablissements enable row level security;
alter table public.professionnels enable row level security;
alter table public.horaires_disponibilite enable row level security;
alter table public.indisponibilites enable row level security;
alter table public.abonnements enable row level security;
alter table public.rendez_vous enable row level security;
alter table public.consultations enable row level security;
alter table public.ordonnances enable row level security;
alter table public.paiements enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.signalements enable row level security;

-- Fonction utilitaire : rôle de l'utilisateur courant
create or replace function public.mon_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---------- PROFILES ----------
create policy "Voir son propre profil" on public.profiles
  for select using (id = auth.uid() or public.mon_role() = 'admin');
create policy "Modifier son propre profil" on public.profiles
  for update using (id = auth.uid());
create policy "Créer son profil à l'inscription" on public.profiles
  for insert with check (id = auth.uid());

-- ---------- PATIENTS ----------
create policy "Patient voit son propre dossier" on public.patients
  for select using (id = auth.uid() or public.mon_role() in ('professionnel','admin'));
create policy "Patient modifie ses infos" on public.patients
  for update using (id = auth.uid());
create policy "Patient crée son profil" on public.patients
  for insert with check (id = auth.uid());

-- ---------- DOSSIERS MÉDICAUX ----------
create policy "Accès dossier médical" on public.dossiers_medicaux
  for select using (
    patient_id = auth.uid()
    or public.mon_role() = 'admin'
    or exists (
      select 1 from public.rendez_vous r
      where r.patient_id = dossiers_medicaux.patient_id
      and r.professionnel_id = auth.uid()
    )
  );
create policy "Patient gère son dossier médical" on public.dossiers_medicaux
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- ---------- DOCUMENTS MÉDICAUX ----------
create policy "Accès documents médicaux" on public.documents_medicaux
  for select using (
    patient_id = auth.uid()
    or public.mon_role() = 'admin'
    or exists (
      select 1 from public.rendez_vous r
      where r.patient_id = documents_medicaux.patient_id
      and r.professionnel_id = auth.uid()
    )
  );
create policy "Ajout de documents" on public.documents_medicaux
  for insert with check (patient_id = auth.uid() or ajoute_par = auth.uid());

-- ---------- ÉTABLISSEMENTS ----------
create policy "Lecture publique établissements" on public.etablissements
  for select using (true);
create policy "Établissement modifie ses infos" on public.etablissements
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ---------- PROFESSIONNELS ----------
create policy "Lecture publique professionnels" on public.professionnels
  for select using (true);
create policy "Pro modifie son profil" on public.professionnels
  for update using (id = auth.uid() or etablissement_id = auth.uid());
create policy "Pro crée son profil" on public.professionnels
  for insert with check (id = auth.uid());
create policy "Admin gère tous les professionnels" on public.professionnels
  for update using (public.mon_role() = 'admin');

-- ---------- HORAIRES / INDISPONIBILITÉS ----------
create policy "Lecture publique horaires" on public.horaires_disponibilite
  for select using (true);
create policy "Pro gère ses horaires" on public.horaires_disponibilite
  for all using (professionnel_id = auth.uid()) with check (professionnel_id = auth.uid());

create policy "Lecture publique indisponibilites" on public.indisponibilites
  for select using (true);
create policy "Pro gère ses indisponibilités" on public.indisponibilites
  for all using (professionnel_id = auth.uid()) with check (professionnel_id = auth.uid());

-- ---------- ABONNEMENTS ----------
create policy "Voir son abonnement" on public.abonnements
  for select using (
    professionnel_id = auth.uid() or etablissement_id = auth.uid() or public.mon_role() = 'admin'
  );
create policy "Admin gère les abonnements" on public.abonnements
  for all using (public.mon_role() = 'admin');

-- ---------- RENDEZ-VOUS ----------
create policy "Voir ses rendez-vous" on public.rendez_vous
  for select using (
    patient_id = auth.uid() or professionnel_id = auth.uid() or public.mon_role() = 'admin'
  );
create policy "Patient prend rendez-vous" on public.rendez_vous
  for insert with check (patient_id = auth.uid());
create policy "Mise à jour rendez-vous" on public.rendez_vous
  for update using (patient_id = auth.uid() or professionnel_id = auth.uid());
-- Suppression réservée à l'historique déjà terminé (jamais un RDV actif)
create policy "Patient supprime son historique termine" on public.rendez_vous
  for delete using (patient_id = auth.uid() and statut in ('annule', 'refuse', 'termine'));
create policy "Pro supprime son historique termine" on public.rendez_vous
  for delete using (professionnel_id = auth.uid() and statut in ('annule', 'refuse', 'termine'));

-- ---------- CONSULTATIONS ----------
create policy "Accès consultation" on public.consultations
  for select using (
    exists (
      select 1 from public.rendez_vous r
      where r.id = consultations.rendez_vous_id
      and (r.patient_id = auth.uid() or r.professionnel_id = auth.uid())
    )
  );
create policy "Pro crée la consultation" on public.consultations
  for insert with check (
    exists (
      select 1 from public.rendez_vous r
      where r.id = rendez_vous_id and r.professionnel_id = auth.uid()
    )
  );
create policy "Pro modifie la consultation" on public.consultations
  for update using (
    exists (
      select 1 from public.rendez_vous r
      where r.id = consultations.rendez_vous_id and r.professionnel_id = auth.uid()
    )
  );

-- ---------- ORDONNANCES ----------
create policy "Accès ordonnance" on public.ordonnances
  for select using (patient_id = auth.uid() or professionnel_id = auth.uid());
create policy "Pro crée ordonnance" on public.ordonnances
  for insert with check (professionnel_id = auth.uid());
create policy "Pro modifie ordonnance" on public.ordonnances
  for update using (professionnel_id = auth.uid());

-- ---------- PAIEMENTS ----------
create policy "Accès paiements" on public.paiements
  for select using (patient_id = auth.uid() or professionnel_id = auth.uid() or public.mon_role() = 'admin');
create policy "Pro declare un paiement manuel pour son abonnement" on public.paiements
  for insert with check (professionnel_id = auth.uid());
create policy "Admin confirme les paiements" on public.paiements
  for update using (public.mon_role() = 'admin');

-- ---------- CONVERSATIONS / MESSAGES ----------
create policy "Accès conversation" on public.conversations
  for select using (patient_id = auth.uid() or professionnel_id = auth.uid());
create policy "Création conversation" on public.conversations
  for insert with check (patient_id = auth.uid() or professionnel_id = auth.uid());

create policy "Accès messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.patient_id = auth.uid() or c.professionnel_id = auth.uid())
    )
  );
create policy "Envoi message" on public.messages
  for insert with check (expediteur_id = auth.uid());
create policy "Marquer message lu" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.patient_id = auth.uid() or c.professionnel_id = auth.uid())
    )
  );

-- ---------- NOTIFICATIONS ----------
create policy "Voir ses notifications" on public.notifications
  for select using (destinataire_id = auth.uid());
create policy "Marquer notification lue" on public.notifications
  for update using (destinataire_id = auth.uid());
create policy "Utilisateur cree ses propres notifications" on public.notifications
  for insert with check (destinataire_id = auth.uid());

-- ---------- SIGNALEMENTS ----------
create policy "Créer un signalement" on public.signalements
  for insert with check (auteur_id = auth.uid());
create policy "Admin voit les signalements" on public.signalements
  for select using (public.mon_role() = 'admin' or auteur_id = auth.uid());

-- =========================================================================
-- FIN DES POLITIQUES RLS
-- =========================================================================
