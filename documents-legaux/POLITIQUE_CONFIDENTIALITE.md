# Politique de confidentialité — Santé-CI

> ⚠️ **Document à faire relire par un avocat spécialisé en protection des données
> avant publication.** Les données de santé sont une catégorie de données
> particulièrement sensible. Ce brouillon s'appuie sur la loi ivoirienne
> n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère
> personnel et sur les compétences de l'ARTCI (Autorité de Régulation des
> Télécommunications/TIC de Côte d'Ivoire) telles que généralement connues à ce
> jour — **vérifiez que ces références sont toujours exactes et à jour** avant
> publication, la réglementation pouvant évoluer.

*Dernière mise à jour : [date]*

## 1. Qui sommes-nous

[Nom de votre société], éditeur de la Plateforme Santé-CI, est responsable du
traitement des données à caractère personnel décrites dans la présente politique.
Coordonnées : voir les Mentions légales.

## 2. Quelles données nous collectons

### 2.1 Tous les comptes
- Identité : nom, prénom, adresse e-mail, numéro de téléphone
- Identifiants de connexion (mot de passe, stocké de façon chiffrée par notre
  prestataire d'authentification, jamais en clair)
- Rôle du compte (patient, professionnel, laboratoire, établissement, admin)

### 2.2 Comptes patients
- Date de naissance, sexe, ville
- **Données de santé** (catégorie de données sensibles) : groupe sanguin,
  allergies, maladies chroniques, traitements en cours, antécédents médicaux,
  documents médicaux, ordonnances, résultats d'analyses de laboratoire
- Historique des rendez-vous et des échanges avec les professionnels/laboratoires
  consultés

### 2.3 Comptes professionnels et laboratoires
- Spécialité ou domaine d'activité, numéro d'autorisation d'exercice, ville,
  adresse professionnelle, tarifs, moyens de paiement acceptés
- Document justificatif d'exercice (carte professionnelle, diplôme, agrément) —
  utilisé uniquement pour la vérification par notre équipe, non partagé
  publiquement
- Données relatives aux paiements d'abonnement (référence de transaction,
  numéro de téléphone ayant servi au transfert) — utilisées uniquement pour
  vérifier et activer l'abonnement

### 2.4 Données techniques
- Journaux de connexion et d'usage nécessaires au bon fonctionnement et à la
  sécurité de la Plateforme

**Nous ne collectons aucune donnée de paiement de carte bancaire** : les
consultations, analyses et abonnements se règlent soit directement entre
utilisateurs (hors Plateforme), soit par transfert Mobile Money dont seule la
référence de transaction (et non les identifiants du compte Mobile Money) nous
est communiquée.

## 3. Pourquoi nous traitons ces données (finalités et bases légales)

| Finalité | Base légale |
|---|---|
| Créer et gérer votre compte | Exécution du contrat (conditions d'utilisation) |
| Mettre en relation patients, professionnels et laboratoires | Exécution du contrat |
| Permettre la tenue d'un dossier médical et son partage avec les professionnels que vous consultez | Consentement explicite (donnée de santé) |
| Vérifier l'identité et les qualifications des professionnels/laboratoires | Intérêt légitime (sécurité des utilisateurs) |
| Traiter les abonnements et vérifier les paiements | Exécution du contrat |
| Envoyer des notifications liées à votre activité (rendez-vous, validation de compte, etc.) | Exécution du contrat |
| Assurer la sécurité de la Plateforme et prévenir la fraude | Intérêt légitime / obligation légale |

## 4. Qui a accès à vos données

- **Vous-même**, à tout moment, depuis votre espace.
- **Les professionnels et laboratoires avec qui vous avez un rendez-vous ou une
  demande en cours** : accès limité au dossier médical, aux documents et aux
  échanges strictement nécessaires à votre prise en charge.
- **Notre équipe** (administrateurs), de façon limitée, pour la vérification des
  comptes professionnels/laboratoires, la modération et le support technique.
- **Nos sous-traitants techniques**, qui hébergent l'infrastructure et n'ont pas
  vocation à consulter vos données en dehors de la maintenance technique :
  - **Supabase Inc.** (base de données, authentification, stockage de fichiers)
  - **[Vercel/Netlify/...]** (hébergement de l'application web)
  - **Jitsi Meet** (visioconférence pour les téléconsultations) — aucune donnée
    de compte Santé-CI n'est transmise à Jitsi, seule la connexion à la salle
    vidéo transite par leur service au moment de la consultation
  - Le cas échéant, un prestataire d'envoi de SMS (uniquement si cette option
    est activée par l'éditeur)

**Nous ne vendons ni ne louons vos données à des tiers à des fins publicitaires.**
Les professionnels et laboratoires ne reçoivent jamais l'ensemble de votre dossier
sans lien avec vous (rendez-vous ou demande en cours).

### Transfert international
Nos sous-traitants techniques peuvent héberger des données en dehors de la Côte
d'Ivoire (selon la région d'hébergement choisie pour votre projet Supabase et
votre hébergeur front-end). [Précisez ici la région d'hébergement effective et
les garanties appliquées — clauses contractuelles types, etc.]

## 5. Durée de conservation

- **Compte actif** : les données sont conservées tant que le compte existe.
- **Dossier médical, documents, ordonnances, résultats d'analyses** : conservés
  tant que le compte patient est actif, sauf demande de suppression (cf. section 6).
- **Données de compte après suppression** : supprimées ou anonymisées dans un
  délai de [délai à définir, ex : 30 jours], sous réserve des obligations légales
  de conservation applicables (notamment comptables/fiscales pour les données de
  paiement).
- **Journaux techniques** : conservés [durée, ex : 12 mois maximum].

## 6. Vos droits

Conformément à la loi n° 2013-450 relative à la protection des données à
caractère personnel, vous disposez des droits suivants sur vos données :

- **Droit d'accès** : obtenir la confirmation que vos données sont traitées et
  en obtenir une copie.
- **Droit de rectification** : corriger des données inexactes (directement
  possible depuis votre espace pour la plupart des champs).
- **Droit d'effacement** : demander la suppression de votre compte et de vos
  données, sous réserve des obligations légales de conservation.
- **Droit d'opposition** : vous opposer à certains traitements pour motif
  légitime.
- **Droit à la portabilité** : recevoir vos données dans un format structuré.

Pour exercer ces droits, contactez [contact@sante-ci.example]. Vous pouvez
également introduire une réclamation auprès de l'ARTCI, autorité ivoirienne
compétente en matière de protection des données personnelles.

## 7. Sécurité

- Connexions chiffrées (HTTPS) sur l'ensemble de la Plateforme.
- Cloisonnement strict des données par un système de règles d'accès en base de
  données (chaque utilisateur ne peut techniquement consulter que les données
  qui le concernent ou pour lesquelles il a une relation active avec le patient
  concerné).
- Documents et fichiers médicaux stockés dans des espaces privés, non
  accessibles publiquement, avec accès temporaire et journalisé.
- Mots de passe jamais stockés en clair.

Aucun système n'étant infaillible, nous nous engageons à notifier les personnes
concernées et, le cas échéant, l'autorité compétente, en cas de violation de
données susceptible d'engendrer un risque pour vos droits et libertés,
conformément à la réglementation applicable.

## 8. Mineurs

La Plateforme n'est pas destinée à la création de comptes par des mineurs non
accompagnés. [Précisez ici votre politique exacte : âge minimum, modalités de
création d'un dossier pour un enfant par son représentant légal, etc.]

## 9. Cookies et traceurs

[À compléter selon les outils effectivement utilisés : cookies de session
techniques indispensables au fonctionnement (authentification), et le cas
échéant, tout outil de mesure d'audience. Si aucun cookie non essentiel n'est
utilisé, l'indiquer explicitement.]

## 10. Modification de cette politique

Cette politique peut être mise à jour. Toute modification substantielle vous
sera notifiée par un moyen approprié (notification dans l'application ou
e-mail) avant son entrée en vigueur.

## 11. Contact

Pour toute question relative à cette politique de confidentialité ou à
l'exercice de vos droits : [contact@sante-ci.example]
