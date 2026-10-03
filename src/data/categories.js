// CATEGORIES (types de voyage) et DESTINATIONS (suggestions) sont
// désormais gérées depuis l'admin et stockées en base — voir
// fetchCategories() / fetchDestinations() dans src/utils/db.js. Ce
// fichier ne garde que ce qui reste codé en dur pour l'instant.

// Filet de secours si les tables categories/destinations sont vides (ex. :
// script SQL pas encore exécuté) — évite un menu vide dans le formulaire.
export const FALLBACK_CATEGORIES = [
  { id: 'organise', label: 'Voyage organisé' },
  { id: 'sejour', label: 'Séjour' },
  { id: 'circuit', label: 'Circuit touristique' },
  { id: 'groupe', label: 'Voyage en groupe' },
  { id: 'pelerinage', label: 'Pèlerinage' },
  { id: 'autre', label: 'Autre service touristique' },
]

export const FALLBACK_DESTINATIONS = [
  'Dubaï', 'France', 'Maroc', 'Sénégal', 'Turquie', 'Arabie Saoudite',
]

export const OFFER_TYPES = [
  { id: 'billet', label: 'Billet', icon: '✈️' },
  { id: 'voyage', label: 'Voyage', icon: '🌍' },
]

// Moyens de paiement qu'une agence peut accepter de ses clients (à ne
// pas confondre avec PAYMENT_METHODS dans data/plans.js, qui concerne le
// paiement de l'agence vers la plateforme pour son abonnement/boost).
export const AGENCY_PAYMENT_OPTIONS = ['Orange Money', 'MTN Money', 'Moov Money', 'Wave', 'Espèces', 'Virement bancaire']

export const SERVICES = [
  'Billet d\'avion', 'Hébergement', 'Petit-déjeuner', 'Déjeuner', 'Dîner',
  'Transfert aéroport', 'Transport local', 'Excursions', 'Guide',
  'Assurance', 'Assistance', 'Visa',
]

export const DEPARTURE_CITIES = [
  'Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Autre',
]

export const DURATIONS = [
  { id: '1-3', label: '1 à 3 jours', min: 1, max: 3 },
  { id: '4-7', label: '4 à 7 jours', min: 4, max: 7 },
  { id: '8-14', label: '8 à 14 jours', min: 8, max: 14 },
  { id: '15+', label: 'Plus de 14 jours', min: 15, max: 9999 },
]

export const SORT_OPTIONS = [
  { id: 'pertinence', label: 'Pertinence' },
  { id: 'prix_asc', label: 'Prix croissant' },
  { id: 'prix_desc', label: 'Prix décroissant' },
  { id: 'recent', label: 'Plus récents' },
  { id: 'populaire', label: 'Plus consultés' },
]

// Le quota de base gratuit et les formules payantes sont définis dans
// src/data/plans.js (PLANS, BASE_FREE_LISTINGS_PER_MONTH).
