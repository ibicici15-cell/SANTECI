// Bus minimaliste : n'importe quelle action qui change un compteur affiché
// dans la Navbar (favoris, demandes, documents du casier) appelle
// notifyCountsChanged() ; la Navbar écoute et se rafraîchit aussitôt, sans
// attendre une reconnexion ou un changement de page.
const listeners = new Set()

export function subscribeCounts(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifyCountsChanged() {
  listeners.forEach(fn => fn())
}
