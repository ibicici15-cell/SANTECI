// Onglets de la barre du bas, selon le type de compte.
export function getTabs({ user, agency, traveler }) {
  if (agency) {
    return [
      { to: '/', label: 'Accueil', icon: 'home', exact: true },
      { to: '/agence/tableau-de-bord', label: 'Annonces', icon: 'grid' },
      { to: '/agence/demandes', label: 'Demandes', icon: 'inbox', badge: 'agencyNewCount' },
      { to: '/agence/abonnement', label: 'Abonnement', icon: 'card' },
      { to: '/compte', label: 'Profil', icon: 'user' },
    ]
  }
  if (traveler || user) {
    return [
      { to: '/', label: 'Accueil', icon: 'home', exact: true },
      { to: '/favoris', label: 'Favoris', icon: 'heart' },
      { to: '/mes-demandes', label: 'Messages', icon: 'chat' },
      { to: '/mon-casier', label: 'Casier', icon: 'folder' },
      { to: '/compte', label: 'Profil', icon: 'user' },
    ]
  }
  return [
    { to: '/', label: 'Accueil', icon: 'home', exact: true },
    { to: '/recherche', label: 'Explorer', icon: 'compass' },
    { to: '/compte', label: 'Compte', icon: 'user' },
  ]
}

export function tabMatches(tab, pathname) {
  return tab.exact ? pathname === tab.to : pathname === tab.to || pathname.startsWith(tab.to + '/')
}

// Pages où la barre d'onglets est masquée (parcours de connexion, admin).
export function hidesTabBar(pathname) {
  return /^\/(compte\/(connexion|inscription)|agence\/(connexion|inscription)|admin)/.test(pathname)
}

export const PAGE_TITLES = [
  ['/compte/connexion', 'Connexion voyageur'],
  ['/compte/inscription', 'Créer un compte'],
  ['/compte', 'Mon compte'],
  ['/profil', 'Mon profil'],
  ['/recherche', 'Explorer'],
  ['/annonce/', 'Détail de l\'offre'],
  ['/agences/', 'Agence'],
  ['/favoris', 'Favoris'],
  ['/mes-demandes', 'Messages'],
  ['/mon-casier', 'Mon casier'],
  ['/contact', 'Contact'],
  ['/regles-publication', 'Règles de publication'],
  ['/agence/connexion', 'Connexion agence'],
  ['/agence/inscription', 'Inscription agence'],
  ['/agence/tableau-de-bord', 'Mes annonces'],
  ['/agence/annonces/nouvelle', 'Nouvelle annonce'],
  ['/agence/annonces/', 'Modifier l\'annonce'],
  ['/agence/demandes', 'Demandes reçues'],
  ['/agence/abonnement', 'Abonnement'],
  ['/admin', 'Administration'],
]

export function titleFor(pathname) {
  const hit = PAGE_TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : prefix + '/'))
  return hit ? hit[1] : ''
}
