# Générer l'APK Android — Santé-CI

L'app est un site React (Vite). Pour en faire un APK, on l'emballe avec
**Capacitor** (le standard pour transformer une web app en app Android/iOS
sans tout réécrire). Le projet est déjà configuré (`capacitor.config.json`,
scripts npm) — il ne reste qu'à installer les outils et lancer les
commandes ci-dessous **sur ta machine** (pas possible depuis ce chat : il
faut le SDK Android + Java, que je n'ai pas ici).

## Prérequis (une seule fois)
1. **Node.js** (déjà nécessaire pour le projet).
2. **Android Studio** — https://developer.android.com/studio — installe-le
   et ouvre-le au moins une fois pour qu'il télécharge le SDK Android.
3. **Java JDK 17** — souvent déjà inclus avec Android Studio.

## Étapes

```bash
# 1) Dans le dossier du projet, installer les dépendances (dont Capacitor)
npm install

# 2) Construire le site (crée le dossier dist/)
npm run build

# 3) Ajouter la plateforme Android au projet (une seule fois)
npx cap add android

# 4) Corrige la version de Gradle pour qu'elle supporte Java 21
#    (évite l'erreur "Gradle JVM version incompatible" dans Android Studio)
npm run fix-gradle

# 5) Générer l'icône et le splash screen à toutes les tailles Android
npm run assets

# 6) Copier le build web dans le projet Android
npx cap sync android
```

### Option A — Générer l'APK en une commande
```bash
npm run apk:debug
```
L'APK apparaît ici :
`android/app/build/outputs/apk/debug/app-debug.apk`

C'est un **APK de debug** : installable directement sur un téléphone
(active "Sources inconnues" dans les réglages Android), parfait pour
tester ou faire essayer l'app aux médecins/labos avant publication.

### Option B — Ouvrir dans Android Studio (recommandé pour l'icône, le nom, et publier sur le Play Store)
```bash
npx cap open android
```
Android Studio s'ouvre sur le projet. Depuis là :
- **Build → Build Bundle(s) / APK(s) → Build APK(s)** pour un APK de test.
- **Build → Generate Signed Bundle / APK** pour un APK/AAB signé, prêt pour
  le Play Store (il faudra créer un keystore la première fois — Android
  Studio te guide).

## Icône et écran d'ouverture (splash screen)
L'icône (croix + pouls, vert/orange) et le splash screen sont déjà prêts
dans `resources/` (`icon.png`, `icon-foreground.png`, `icon-background.png`,
`splash.png`). Une seule commande les applique à toutes les tailles
Android nécessaires — à lancer **une fois `npx cap add android` fait** :

```bash
npm run assets
```

Puis (ou si tu l'avais déjà fait avant) :
```bash
npx cap sync android
```

Nom de l'app : "Santé-CI" (modifiable dans `capacitor.config.json`, champ
`appName`, puis relancer `npx cap sync android`).

Si tu changes plus tard l'image source, remplace les fichiers dans
`resources/` et relance `npm run assets && npx cap sync android`.

## À chaque mise à jour du code
```bash
npm run build
npx cap sync android
npm run apk:debug   # ou repasser par Android Studio
```
(`npm run assets` n'est à relancer que si tu changes l'icône/le splash —
pas à chaque build. Pareil pour `npm run fix-gradle` : une fois suffit,
sauf si tu supprimes puis régénères le dossier `android/`.)

## Dépannage
**"The project's Gradle version X is incompatible with the Gradle JVM
version 21"** dans Android Studio → lance `npm run fix-gradle` (voir
étape 4 ci-dessus) puis resynchronise le projet (`File` → `Sync Project
with Gradle Files`).

## Remarque
L'app appelle Supabase par Internet (comme dans un navigateur) : le
téléphone doit être connecté pour que la connexion, les rendez-vous, la
messagerie, etc. fonctionnent — c'est normal, rien à configurer de plus.

## Notifications push
Voir `GUIDE_PUSH.md` — nécessite une configuration Firebase en plus
(fichier `google-services.json` à ajouter au projet Android).
