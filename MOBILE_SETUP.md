# Application Android — mise en route

## 1. Voir l'apparence « app » sans téléphone
Ouvre le site (`npm run dev`) avec `?app=1` : `http://localhost:5173/?app=1`
(barre d'onglets en bas, barre du haut compacte, plus de footer).
`?app=0` revient à la version web. Dans l'APK, ce mode est automatique.

| Compte | Onglets |
|---|---|
| Visiteur | Accueil · Explorer · Compte |
| Voyageur | Accueil · Favoris · Messages · Casier · Profil |
| Agence | Accueil · Annonces · Demandes (pastille) · Abonnement · Profil |

## 2. Projet Android
```bash
npm install
# Si tu n'as pas encore de dossier android/ :
cp capacitor.config.example.json capacitor.config.json   # adapte appId si besoin
npx cap add android

# Logo : copie les icônes / écran de démarrage / icône de notification
cp -r native-assets/android-res/* android/app/src/main/res/

npm run android:sync      # build web + cap sync
npx cap open android
```
> Capacitor 8 est utilisé. Si ton dossier `android/` existe déjà avec une autre
> version majeure, lance `npx cap migrate` (ou aligne les versions dans package.json).

Pour changer le logo plus tard : modifie `scripts/generate-icons.mjs`, puis
`npm run icons` et `npm run android:assets`.

## 3. Notifications push (Firebase)
1. **Firebase** → crée un projet → *Ajouter une application Android* avec le même
   `appId` que `capacitor.config.json` → télécharge `google-services.json` et place-le
   dans `android/app/`.
2. **Supabase → SQL Editor** : exécute, dans l'ordre,
   `supabase/migration_push_tokens.sql` puis `supabase/migration_notification_links.sql`
   (le 2ᵉ fait ouvrir directement la bonne conversation quand on touche une notification).
3. **Clé du serveur** : Firebase → Paramètres du projet → *Comptes de service* →
   *Générer une nouvelle clé privée* (fichier JSON). Puis :
   ```bash
   supabase functions deploy send-push
   supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat chemin/vers/cle.json)"
   ```
4. **Supabase → Database → Webhooks → Create** : table `notifications`, événement
   **Insert**, type **Supabase Edge Functions** → `send-push`.
5. **AndroidManifest.xml** (`android/app/src/main/`), dans `<application>` :
   ```xml
   <meta-data android:name="com.google.firebase.messaging.default_notification_icon"
              android:resource="@drawable/ic_stat_notification" />
   <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id"
              android:value="default" />
   ```
   et vérifie la présence de
   `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` (Android 13+).

**Test** : connecte-toi sur le téléphone (la permission est demandée à la première
connexion), puis dans Supabase insère une ligne dans `notifications` avec ton
`recipient_id` : la notification arrive, et un appui ouvre la page du `link`.

## 4. Ce qui a été ajouté côté code
- `src/native/` : détection Android, bouton retour, barre d'état, écran de démarrage, push.
- `src/components/ScrollManager.jsx` : retour en haut à chaque page, défilement vers les ancres
  (`#resultats`, `#contact`, `#demande-<id>`…), arrivée directe sur les formulaires de connexion,
  champs toujours visibles au-dessus du clavier.
- Après connexion, retour à la page d'origine (ex. bouton ♡ → connexion → retour sur l'offre).
