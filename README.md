# Santé-CI — Plateforme numérique de santé (Côte d'Ivoire)

Application web complète : React (Vite) + Tailwind CSS + Supabase (base de données Postgres,
authentification, sécurité par ligne / RLS, stockage de fichiers, messagerie en temps réel).

## Modèle économique

- **Patients** : inscription et utilisation 100% gratuites.
- **Professionnels** : 1 mois d'essai gratuit à l'inscription, puis abonnement :
  - **Mensuel** : 12 000 FCFA / mois
  - **Annuel** : 120 000 FCFA / an (2 mois offerts)
  - Paiement par **transfert Mobile Money manuel** (MTN Money, Orange Money, Wave) vers les
    numéros de la plateforme, avec référence de transaction déclarée par le professionnel et
    vérifiée par un administrateur avant activation. Aucune commission n'est prélevée sur les
    consultations.
- **Paiement des consultations** : réglé directement entre le patient et le professionnel
  (espèces, mobile money, carte, virement...), la plateforme n'intervient jamais dans cette
  transaction — elle affiche juste les moyens acceptés par chaque professionnel.

## Fonctionnalités additionnelles

- **Collaboration entre professionnels** : un professionnel validé peut solliciter un ou
  plusieurs confrères d'une autre spécialité pour un avis (ex : généraliste → chirurgien).
  Le demandeur choisit avec qui il continue une fois qu'un ou plusieurs ont accepté ; les
  autres sont notifiés automatiquement que la demande est résolue. Tarifs et modalités se
  négocient ensuite directement entre les deux confrères, hors plateforme.
- **Laboratoires** : 3e type de compte (comme patient/professionnel), même parcours
  (essai 1 mois, abonnement, validation admin par document). Catalogue d'analyses avec
  prix/délai/mode de retrait, recherche filtrée par type d'analyse, demandes pré-remplies
  automatiquement depuis le catalogue ou en devis libre. Le résultat n'est visible que par
  celui qui a fait la demande (patient ou professionnel).

## 1. Créer le projet Supabase

1. Allez sur https://supabase.com → **New project**.
2. Notez `Project URL` et `anon public key` (Project Settings → API) pour votre `.env`.
3. Ouvrez **SQL Editor** et exécutez, **dans l'ordre** :
   1. `supabase/schema.sql`
   2. `supabase/policies.sql`
   3. `supabase/storage.sql`
   4. `supabase/mise_a_jour_6.sql` (notifications validation/refus/abonnement)
   5. `supabase/mise_a_jour_7.sql` (collaboration entre professionnels + rôle laboratoire)
   6. `supabase/mise_a_jour_8.sql` (notifications de collaboration)
4. **Authentication → Providers → Email** : désactivez "Confirm email" en phase de test.
5. **Database → Replication** : activez la réplication sur la table `messages` (messagerie
   en temps réel + badge de messages non lus).
6. (Optionnel) `supabase/cron.sql` pour automatiser les rappels de rendez-vous et la
   désactivation des professionnels dont l'abonnement a expiré — voir section 4.

## 2. Configurer le frontend

```bash
cd sante-ci
cp .env.example .env
# renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
npm install
npm run dev
```
→ http://localhost:5173

## 3. Comptes de test

- Inscrivez-vous via `/inscription/patient` et `/inscription/professionnel`.
- Le compte professionnel doit ensuite, depuis "Modifier mon profil", téléverser un document
  justificatif — sans quoi l'admin ne peut pas le valider et il n'apparaît jamais en recherche.
- Pour créer un **compte administrateur** : inscrivez-vous normalement, puis dans
  **Table Editor → profiles**, changez la colonne `role` en `admin`. Accès à `/admin/tableau-de-bord`.

## 4. Numéros Mobile Money de la plateforme

Modifiables dans `src/lib/constantes.js` (`OPERATEURS_MOBILE_MONEY`) :
- MTN Money : 05 06 86 17 82
- Orange Money : 07 77 33 65 94
- Wave : 05 85 99 93 13

## 5. (Optionnel) Rappels automatiques par SMS

Le paiement de l'abonnement ne nécessite **aucune** configuration supplémentaire (transfert
manuel). Cette étape sert uniquement si vous voulez que les rappels de rendez-vous et les
alertes de fin d'essai soient envoyés par SMS (sinon ils restent visibles dans l'application) :

```bash
npm install -g supabase
supabase login
supabase link --project-ref VOTRE_REFERENCE_PROJET

supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set SMS_API_URL=... SMS_API_KEY=... SMS_SENDER=SanteCI

supabase functions deploy taches-planifiees --no-verify-jwt
```
Puis planifiez son appel toutes les 15 min (Dashboard → Edge Functions → Schedules, ou
exécutez `supabase/cron.sql` en remplaçant `<PROJECT_REF>` et `<SERVICE_ROLE_KEY>`).

## 6. À propos des fonctions CinetPay

Le dossier `supabase/functions/cinetpay-initier` et `cinetpay-webhook`, ainsi que
`src/lib/paiement.js`, sont **conservés dans le projet mais non utilisés** dans le parcours
actuel (paiement 100% par transfert manuel). Ils restent disponibles si vous souhaitez activer
un paiement automatique par carte/mobile money plus tard.

## 7. Déploiement en ligne (gratuit pour démarrer)

- **Vercel / Netlify / Cloudflare Pages** pour le frontend (build : `npm run build`, dossier `dist`).
- **Supabase** (plan gratuit) pour la base de données, l'authentification et le stockage.
- Renseignez les mêmes variables d'environnement dans les paramètres du projet d'hébergement.

## 8. Structure du projet

```
sante-ci/
├── supabase/
│   ├── schema.sql       → tables, types, triggers, fonctions de maintenance
│   ├── policies.sql     → sécurité RLS
│   ├── storage.sql      → buckets de fichiers
│   ├── cron.sql         → tâche planifiée optionnelle
│   └── functions/       → Edge Functions (taches-planifiees actif, cinetpay-* non utilisées)
├── src/
│   ├── lib/              → client Supabase, constantes (tarifs, numéros Mobile Money...)
│   ├── context/           → AuthContext (session, rôle, profil)
│   ├── components/        → Navbar, cartes, badges, route protégée
│   └── pages/              → toutes les pages de l'application
└── GUIDE_LANCEMENT_ET_TESTS.md → checklist complète de tests
```
