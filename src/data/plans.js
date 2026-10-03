// Numéros de réception Mobile Money — à remplacer par les vrais numéros
// de l'agence exploitant Agnini Sanfè avant mise en production.
export const PAYMENT_METHODS = [
  { id: 'orange', label: 'Orange Money', number: '07 00 00 00 00' },
  { id: 'mtn', label: 'MTN Money', number: '05 00 00 00 00' },
  { id: 'wave', label: 'Wave', number: '01 00 00 00 00' },
]

// Le quota de base (5 annonces/mois) est TOUJOURS inclus, quel que soit
// le plan, et se renouvelle chaque mois calendaire — voir
// check_listing_quota() côté base de données.
export const BASE_FREE_LISTINGS_PER_MONTH = 5

export const PLANS = [
  {
    id: 'free',
    label: 'Gratuit',
    price: 0,
    listingsPerMonth: BASE_FREE_LISTINGS_PER_MONTH,
    freeBoosts: 0,
    description: 'Pour commencer et tester la plateforme.',
  },
  {
    id: 'standard',
    label: 'Standard',
    price: 15000,
    listingsPerMonth: 20 + BASE_FREE_LISTINGS_PER_MONTH,
    freeBoosts: 5,
    description: 'Badge Standard, 5 boosts gratuits d\'1 mois inclus chaque mois.',
  },
  {
    id: 'premium',
    label: 'Premium',
    price: 25000,
    listingsPerMonth: 50 + BASE_FREE_LISTINGS_PER_MONTH,
    freeBoosts: 10,
    description: 'Badge Premium, 10 boosts gratuits d\'1 mois inclus chaque mois.',
  },
]

export function planById(id) {
  return PLANS.find(p => p.id === id) || PLANS[0]
}

// Boosts payants à l'unité (indépendants de l'abonnement)
export const BOOST_OPTIONS = [
  { id: '3j', days: 3, price: 1500, label: '3 jours' },
  { id: '7j', days: 7, price: 2500, label: '7 jours' },
  { id: '15j', days: 15, price: 4000, label: '15 jours' },
  { id: '30j', days: 30, price: 7000, label: '30 jours' },
]
