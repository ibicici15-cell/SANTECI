// Petit registre pour pouvoir naviguer (react-router) depuis du code qui
// n'est pas un composant — typiquement les écouteurs d'événements de
// @capacitor/push-notifications, déclenchés quand l'utilisateur tape sur
// une notification push reçue.
let naviguerVers = null

export function definirNavigation(fn) {
  naviguerVers = fn
}

export function naviguer(chemin) {
  if (naviguerVers) naviguerVers(chemin)
  else window.location.href = chemin // repli si appelé avant que l'app ait fini de monter
}
