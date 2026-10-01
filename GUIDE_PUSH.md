# Notifications push (Android) — Santé-CI

Le code est déjà prêt côté app et côté serveur. Il reste une configuration
**Firebase** (obligatoire pour que le push fonctionne — c'est Google qui
achemine les notifications vers les téléphones Android) et **Supabase**,
à faire une seule fois.

## 1. Créer le projet Firebase
1. Va sur https://console.firebase.google.com → **Ajouter un projet** →
   nomme-le "Santé-CI" (ou ce que tu veux).
2. Dans le projet, **Ajouter une application** → icône Android.
3. Nom du package Android : **`ci.santeci.app`** (doit correspondre
   exactement à `appId` dans `capacitor.config.json`).
4. Télécharge le fichier **`google-services.json`** proposé.

## 2. Intégrer google-services.json au projet Android
Après avoir fait `npx cap add android` (voir `GUIDE_APK.md`) :

1. Place le fichier téléchargé ici : `android/app/google-services.json`
2. Ouvre `android/build.gradle` (celui à la racine de `android/`, PAS
   celui dans `android/app/`) et ajoute dans `buildscript { dependencies { ... } }` :
   ```gradle
   classpath 'com.google.gms:google-services:4.4.2'
   ```
3. Ouvre `android/app/build.gradle` et ajoute tout en bas du fichier :
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```
4. Relance :
   ```bash
   npx cap sync android
   npm run apk:debug
   ```

À partir de là, l'app peut recevoir des push (le code d'enregistrement du
jeton est déjà en place dans `src/lib/push.js`, appelé automatiquement à
la connexion).

## 3. Configurer l'envoi côté serveur (Supabase)
Le serveur envoie les push via l'API Firebase Cloud Messaging, avec un
**compte de service** (une "clé serveur" moderne, au format JSON).

1. Dans la console Firebase du même projet : ⚙️ **Paramètres du projet**
   → onglet **Comptes de service** → **Générer une nouvelle clé privée**.
   Un fichier JSON se télécharge (garde-le secret, ne le commite jamais).
2. Exécute la migration SQL `mise_a_jour_14.sql` dans le SQL Editor
   Supabase (crée la table des jetons d'appareil + les colonnes de suivi).
3. Donne ce JSON au serveur, comme secret Supabase :
   ```bash
   supabase secrets set FCM_SERVICE_ACCOUNT_JSON='<colle ici tout le contenu du fichier JSON, sur une seule ligne>'
   ```
   (Alternative sans CLI : Dashboard Supabase → Edge Functions →
   `taches-planifiees` → Secrets → ajouter `FCM_SERVICE_ACCOUNT_JSON`.)
4. Redéploie la fonction pour qu'elle prenne en compte le nouveau fichier :
   ```bash
   supabase functions deploy taches-planifiees
   ```

## 4. C'est tout
Si tu as déjà configuré `cron.sql` (tâche planifiée toutes les 15 min),
rien d'autre à faire : chaque notification créée dans l'app (nouveau
rendez-vous, message, etc.) sera désormais aussi envoyée en push, en plus
d'apparaître dans la cloche de l'app. Un tap sur la notification ouvre
directement la bonne page dans l'app (grâce au champ "lien" déjà en place
sur les notifications).

Si tu veux un envoi plus rapide que "jusqu'à 15 minutes plus tard", réduis
l'intervalle du cron dans `cron.sql` (ex. `*/2 * * * *` pour toutes les
2 minutes) et relance cette requête.

## Dépannage
- **Rien ne se passe** : vérifie que `push_tokens` contient bien une ligne
  pour ton utilisateur après connexion sur le téléphone (`select * from
  push_tokens;` dans le SQL Editor). Si vide → la permission n'a
  peut-être pas été accordée sur le téléphone (Réglages Android →
  Applications → Santé-CI → Notifications).
- **Erreur dans les logs de la fonction** (Dashboard Supabase → Edge
  Functions → taches-planifiees → Logs) : le message d'erreur FCM y
  apparaît en clair (JSON mal formé, projet Firebase incorrect, etc.).
