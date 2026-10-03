// Après une connexion, on ramène l'utilisateur là où il était
// (page protégée, bouton « favori »…) au lieu de l'envoyer au profil.
export function backTarget(location, fallback) {
  const from = location?.state?.from
  if (from?.pathname && from.pathname.startsWith('/') && !from.pathname.includes('/connexion') && !from.pathname.includes('/inscription')) {
    return `${from.pathname}${from.search || ''}${from.hash || ''}`
  }
  return fallback
}
