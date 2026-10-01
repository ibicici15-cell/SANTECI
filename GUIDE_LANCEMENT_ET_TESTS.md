# Santé-CI — Guide de lancement & checklist de tests

## 1. Base de données Supabase — scripts SQL à exécuter (SQL Editor, dans cet ordre)

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/storage.sql`
4. `supabase/mise_a_jour_6.sql` (notifications validation/refus/abonnement)
5. `supabase/mise_a_jour_7.sql` (collaboration entre professionnels + rôle laboratoire)

**Vérification rapide que tout est bien en place :**
```sql
-- Doit renvoyer une ligne "creneaux_pris"
select proname from pg_proc where proname = 'creneaux_pris';

-- Doit renvoyer plusieurs colonnes
select column_name from information_schema.columns
where table_name = 'professionnels' and column_name in ('document_justificatif_url', 'motif_rejet');

select column_name from information_schema.columns
where table_name = 'rendez_vous' and column_name = 'necessite_reconfirmation';

select column_name from information_schema.columns
where table_name = 'paiements' and column_name in ('telephone_emetteur', 'reference_transaction', 'plan');
```
Exécutez ces requêtes **une par une** (pas toutes collées ensemble) pour voir chaque résultat clairement.

## 2. Réglages Supabase (une seule fois)

- **Authentication → Providers → Email** : désactivez "Confirm email" en phase de test.
- **Database → Replication** : activez la réplication sur la table `messages`.
- **Storage** : vérifie que les 4 buckets existent (`photos-profil`, `documents-medicaux`, `ordonnances`, `verification-professionnels`).

## 3. Lancer en local

```bash
cd sante-ci
cp .env.example .env
# éditer .env : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Project Settings → API)

npm install
npm run dev
```
→ http://localhost:5173

## 4. Paiement de l'abonnement — aucune configuration requise

Le paiement se fait par transfert Mobile Money manuel (numéros dans `src/lib/constantes.js`),
déclaré par le professionnel et validé par l'admin. **Aucune Edge Function, aucun secret à
configurer** pour que ça fonctionne. CinetPay n'est plus utilisé dans le parcours actuel (code
conservé mais désactivé — voir README section 6).

## 5. (Optionnel) Rappels SMS automatiques

Voir README section 5 si vous voulez des SMS réels pour les rappels de rendez-vous / fin d'essai.

## 6. Déploiement en ligne (0€ pour démarrer)

Vercel/Netlify (frontend, gratuit) + Supabase (plan gratuit) — voir README section 7.

---

## 7. Checklist de tests complète

Utilise **3 fenêtres de navigation privée différentes** (une par rôle).

### A. Inscription & connexion
- [ ] Inscription patient → atterrit directement sur `/patient/tableau-de-bord`
- [ ] Inscription professionnel → atterrit directement sur `/professionnel/tableau-de-bord`
- [ ] Déconnexion puis reconnexion (patient ET professionnel) → atterrit directement sur le dashboard à chaque fois
- [ ] Mauvais mot de passe → message d'erreur clair

### B. Profil professionnel
- [ ] Bannière rouge "Compte non validé" tant que rien n'est fait
- [ ] Uploader une photo → apparaît immédiatement
- [ ] Uploader un document justificatif → badge "Document envoyé — en attente de validation"
- [ ] Cliquer "Modifier mon profil" → champs éditables, bouton devient "Enregistrer mon profil"
- [ ] Modifier un champ → "Enregistrer" → message de succès visible sous le bouton

### C. Disponibilités (professionnel)
- [ ] Bannière orange "Aucune disponibilité renseignée" tant que rien n'est configuré
- [ ] "Modifier mes disponibilités" → grille cliquable (un seul bouton qui bascule Modifier ↔ Enregistrer)
- [ ] Cliquer sur un jour → sélectionne/désélectionne toute la colonne ; "Tout sélectionner / vider" fonctionne
- [ ] "Enregistrer" → message de confirmation, cases restent vertes après reconnexion

### D. Validation admin
- [ ] Créer un admin (Table Editor → `profiles` → `role` = `admin`)
- [ ] Sans document → pas de bouton Valider, juste "En attente du document justificatif"
- [ ] Avec document → "Voir le justificatif", "Refuser", "Valider" apparaissent
- [ ] "Valider" → message de succès, apparaît dans "Professionnels validés"
- [ ] Reconnecté en tant que ce pro → badge "Compte validé" (pas redemandé)
- [ ] "Refuser" avec motif → repasse en attente, motif visible côté pro
- [ ] "Retirer la validation" sur un pro déjà validé → fonctionne

### E. Recherche patient
- [ ] Pro non validé n'apparaît PAS dans la recherche ; apparaît une fois validé
- [ ] Filtres (spécialité, ville, mode) fonctionnent

### F. Prise de rendez-vous (le plus important)
- [ ] Pro non validé → pas de réservation possible
- [ ] Pro validé sans horaires → message clair, réservation bloquée
- [ ] Pro validé avec horaires → créneaux affichés en "07h-08h"
- [ ] Si le jour du jour n'a pas d'horaires, la page saute automatiquement à la prochaine date disponible
- [ ] Réserver → "en attente" côté patient ET pro ("Nouvelles demandes")
- [ ] **Avec un 2e compte patient** : le créneau pris a disparu de la liste
- [ ] Pro refuse → le créneau redevient disponible pour le 2e patient

### G. Cycle de vie d'un rendez-vous
- [ ] Pro confirme → passe en "Prochains rendez-vous confirmés" (disparaît de "Nouvelles demandes", n'apparaît nulle part en double)
- [ ] Patient modifie un RDV confirmé → badge "À reconfirmer" + bannière rouge chez le pro
- [ ] Pro "Reconfirme" → redevient confirmé normalement
- [ ] Patient annule → apparaît dans "Annulations récentes" chez le pro (pas de disparition silencieuse)
- [ ] RDV refusé reste visible côté patient avec badge "Refusé"
- [ ] Cliquer le nom (patient→médecin ou pro→patient) → ouvre la fiche correspondante

### H. Suppression d'historique
- [ ] "Sélectionner pour supprimer" apparaît seulement s'il y a des RDV terminés/annulés/refusés
- [ ] Un RDV actif ne peut jamais être sélectionné/supprimé (patient ET professionnel)

### I. Messagerie
- [ ] Réserver un RDV crée automatiquement une conversation (même non confirmé)
- [ ] Message envoyé → apparaît instantanément côté émetteur
- [ ] Badge rouge sur l'icône messagerie tant qu'un message n'est pas lu ; disparaît à l'ouverture

### J. Téléconsultation
- [ ] Bouton "Rejoindre" sur RDV confirmé en téléconsultation → salle Jitsi, aucun compte requis

### K. Dossier médical & ordonnances
- [ ] Patient renseigne/sauvegarde son dossier médical
- [ ] Patient uploade un document → apparaît dans sa liste
- [ ] Pro clôture une consultation avec ordonnance → notification "document disponible" au patient

### L. Abonnement professionnel (nouveau modèle)
- [ ] Dashboard affiche "Il vous reste X jours d'essai gratuit" (1 mois à l'inscription)
- [ ] Page abonnement affiche les 2 plans : Mensuel 12 000 FCFA, Annuel 120 000 FCFA (2 mois offerts)
- [ ] Choisir un plan → affiche les 3 numéros Mobile Money + le téléphone du profil
- [ ] Déclarer un paiement (opérateur + référence) → apparaît côté admin dans "Paiements par transfert à vérifier"
- [ ] Admin confirme → abonnement du pro passe à "actif", pro redevient visible en recherche
- [ ] Abonnement actif à moins de 7 jours de la fin → bannière "expire dans X jours" avec bouton renouveler

### M. Sécurité
- [ ] Un patient ne peut pas voir le dossier médical d'un autre patient
- [ ] Un pro non validé n'apparaît jamais, même via lien direct de réservation
- [ ] Patient connecté essayant `/admin/tableau-de-bord` → redirection

### N. Collaboration entre professionnels
- [ ] Activer "Accepter les collaborations" dans le profil d'un 2e compte pro
- [ ] Depuis un 1er compte pro : "Trouver une expertise" → recherche par spécialité/ville → le 2e apparaît
- [ ] Envoyer une demande à plusieurs pros à la fois → chacun la voit dans "Mes collaborations → Reçues"
- [ ] Un destinataire accepte → le demandeur voit "A accepté" + bouton "Continuer avec lui"
- [ ] Le demandeur clique "Continuer avec lui" → les autres destinataires passent à "Résolue ailleurs" (notification reçue)
- [ ] Une conversation confrères s'ouvre automatiquement entre les deux retenus (Messagerie confrères)
- [ ] Un pro non validé n'apparaît jamais dans "Trouver une expertise", ne peut pas envoyer de demande

### O. Laboratoires
- [ ] Inscription labo → 1 mois d'essai, doit être validé par l'admin (document justificatif) avant d'apparaître en recherche
- [ ] Profil labo : ajouter des jours d'ouverture + au moins une prestation au catalogue (nom, prix, délai, mode de retrait)
- [ ] Recherche labo par type d'analyse → la prestation apparaît directement avec prix/délai visibles, sans contact préalable
- [ ] Demande avec prestation sélectionnée → tout est pré-rempli automatiquement
- [ ] Demande sans prestation (devis libre) → texte libre requis
- [ ] Labo confirme une demande → dates pré-remplies depuis le délai du catalogue, ajustables
- [ ] Labo livre un résultat (fichier) → seul le demandeur d'origine (patient OU pro, selon qui a demandé) le voit dans "Mes analyses"
- [ ] Messagerie labo fonctionne dans les deux sens (patient↔labo ou pro↔labo)
- [ ] Abonnement labo : mêmes tarifs/paiement manuel que les professionnels

---

Si un point échoue, note lequel précisément (lettre + comportement observé).
