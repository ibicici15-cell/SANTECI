# Déployer la version web sur Netlify

Le projet est déjà prêt (`netlify.toml` présent). Deux façons de faire :

## Option A — Connecté à GitHub (recommandé : redéploie tout seul à chaque mise à jour)

1. **Pousser le code sur GitHub** (si ce n'est pas déjà fait) :
   ```bash
   cd sante-ci
   git init
   git add .
   git commit -m "Version initiale"
   ```
   Crée un dépôt sur https://github.com/new (vide, sans README), puis :
   ```bash
   git remote add origin https://github.com/TON-COMPTE/sante-ci.git
   git branch -M main
   git push -u origin main
   ```

2. **Sur https://app.netlify.com** → "Add new site" → "Import an existing
   project" → connecte GitHub → choisis le dépôt `sante-ci`.

3. Netlify détecte automatiquement `npm run build` et `dist` (grâce à
   `netlify.toml`) — laisse les réglages par défaut, clique "Deploy".

4. **Variables d'environnement** (indispensable, sinon l'app ne peut pas
   parler à Supabase) : Site settings → Environment variables → ajoute :
   - `VITE_SUPABASE_URL` = l'URL de ton projet Supabase
   - `VITE_SUPABASE_ANON_KEY` = la clé publique "anon" de Supabase

   Puis redéploie (Deploys → Trigger deploy) pour qu'elles soient prises
   en compte.

5. Ton site est en ligne sur une adresse `https://un-nom-aleatoire.netlify.app`
   — tu peux la renommer (Site settings → Change site name) ou brancher
   un nom de domaine à toi (Domain settings → Add a domain).

À partir de là, **chaque `git push` redéploie automatiquement** le site.

## Option B — Dépôt direct (sans GitHub, rapide pour un premier test)

1. `npm run build` en local (crée le dossier `dist/`).
2. Sur https://app.netlify.com → "Add new site" → "Deploy manually" →
   glisse-dépose le dossier `dist/`.
3. Ajoute les variables d'environnement comme à l'étape 4 ci-dessus, puis
   refais un build + un nouveau glisser-déposer (cette méthode ne
   redéploie pas toute seule, il faut repasser par là à chaque changement).

## Après le déploiement
- Si tu as déjà généré l'APK pointant vers une URL Supabase directe, rien
  à changer — l'app mobile et le site web parlent au même Supabase.
- Pense à ajouter l'URL Netlify dans Supabase : Authentication → URL
  Configuration → "Site URL" et "Redirect URLs" (sinon certains flux
  d'authentification par lien email pointeront vers localhost).
