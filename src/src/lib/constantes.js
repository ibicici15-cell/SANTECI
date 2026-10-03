export const SPECIALITES = [
  { valeur: 'medecin_generaliste', libelle: 'Médecin généraliste' },
  { valeur: 'medecin_specialiste', libelle: 'Médecin spécialiste' },
  { valeur: 'dentiste', libelle: 'Dentiste' },
  { valeur: 'psychologue', libelle: 'Psychologue' },
  { valeur: 'sage_femme', libelle: 'Sage-femme' },
  { valeur: 'kinesitherapeute', libelle: 'Kinésithérapeute' },
  { valeur: 'infirmier', libelle: 'Infirmier(ère)' },
  { valeur: 'nutritionniste', libelle: 'Nutritionniste' },
  { valeur: 'autre', libelle: 'Autre professionnel de santé' },
]

export const SPECIALITES_LISTE = SPECIALITES.filter(s => s.valeur !== 'autre')

export const VILLES_CI = [
  'Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'San-Pédro',
  'Yamoussoukro', 'Man', 'Divo', 'Gagnoa', 'Abengourou',
]

// Moyens par lesquels le PATIENT règle directement le PROFESSIONNEL pour
// une consultation (espèces, mobile money, etc. — voir la note dans
// FicheProfessionnel.jsx : la plateforme n'intervient jamais dans cette
// transaction, elle affiche juste ce que le professionnel accepte).
export const MOYENS_PAIEMENT = [
  { valeur: 'especes', libelle: 'Espèces' },
  { valeur: 'carte_bancaire', libelle: 'Carte bancaire' },
  { valeur: 'virement', libelle: 'Virement bancaire' },
  { valeur: 'mobile_money', libelle: 'Mobile Money (Orange, MTN, Moov, Wave)' },
  { valeur: 'paypal', libelle: 'PayPal' },
]

export const LANGUES = ['Français', 'Anglais', 'Dioula', 'Baoulé', 'Bété', 'Sénoufo']

// -----------------------------------------------------------------------
// ABONNEMENT PROFESSIONNEL (paiement par transfert Mobile Money manuel,
// vérifié par un administrateur — voir AbonnementProfessionnel.jsx)
// -----------------------------------------------------------------------
export const PLANS_ABONNEMENT = [
  { id: 'mensuel', libelle: 'Mensuel', prix: 12000, periode: '/ mois' },
  { id: 'annuel', libelle: 'Annuel', prix: 120000, periode: '/ an', avantage: '2 mois offerts' },
]

export const OPERATEURS_MOBILE_MONEY = [
  { valeur: 'mtn_money', libelle: 'MTN Money', numero: '05 06 86 17 82' },
  { valeur: 'orange_money', libelle: 'Orange Money', numero: '07 77 33 65 94' },
  { valeur: 'wave', libelle: 'Wave', numero: '05 85 99 93 13' },
]

export const NOM_BENEFICIAIRE_PLATEFORME = 'Santé-CI'

// -----------------------------------------------------------------------
// COLLABORATION ENTRE PROFESSIONNELS
// -----------------------------------------------------------------------
export const NIVEAUX_URGENCE = [
  { valeur: 'normal', libelle: 'Normal' },
  { valeur: 'urgent', libelle: 'Urgent' },
  { valeur: 'tres_urgent', libelle: 'Très urgent' },
]

export function libelleUrgence(valeur) {
  return NIVEAUX_URGENCE.find(u => u.valeur === valeur)?.libelle || valeur
}

// -----------------------------------------------------------------------
// LABORATOIRES
// -----------------------------------------------------------------------
export const MODES_RETRAIT_LABO = [
  { valeur: 'sur_place', libelle: 'À récupérer/payer sur place' },
  { valeur: 'en_ligne', libelle: 'Résultat transmis en ligne' },
  { valeur: 'les_deux', libelle: 'Les deux, au choix du demandeur' },
]

// Types d'analyses courants — proposés comme suggestions dans le catalogue
// d'un laboratoire ET comme filtre de recherche, pour harmoniser les noms
// utilisés par les différents laboratoires (recherche plus fiable).
export const TYPES_ANALYSE_COURANTS = [
  'Numération Formule Sanguine (NFS)',
  'Glycémie',
  'Bilan lipidique',
  'Groupage sanguin (ABO/Rhésus)',
  'Sérologie VIH',
  'Sérologie hépatite B',
  'Sérologie hépatite C',
  'Test de grossesse (BHCG)',
  'Goutte épaisse / TDR paludisme',
  'Sérodiagnostic de Widal (typhoïde)',
  'Analyse d\'urine (ECBU)',
  'Bilan rénal (créatinine, urée)',
  'Bilan hépatique (transaminases)',
  'Coproculture / parasitologie des selles',
  'Spermogramme',
  'Radiographie',
  'Échographie',
  'Scanner',
  'IRM',
]

export function libelleModeRetrait(valeur) {
  return MODES_RETRAIT_LABO.find(m => m.valeur === valeur)?.libelle || valeur
}

export function libelleDelai(heures) {
  if (!heures) return 'Non précisé'
  if (heures < 24) return `${heures} h`
  const jours = Math.round(heures / 24)
  return `${jours} jour${jours > 1 ? 's' : ''}`
}

export function libelleSpecialite(valeur) {
  return SPECIALITES.find(s => s.valeur === valeur)?.libelle || valeur
}

export function libelleOperateur(valeur) {
  return OPERATEURS_MOBILE_MONEY.find(o => o.valeur === valeur)?.libelle || valeur
}

export function formaterFCFA(montant) {
  if (montant === null || montant === undefined) return '—'
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
}

export function formaterDate(dateIso) {
  return new Date(dateIso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formaterHeure(dateIso) {
  return new Date(dateIso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
