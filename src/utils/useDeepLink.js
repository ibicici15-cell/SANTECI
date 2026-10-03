import { useEffect, useRef } from 'react'

// Ouvre l'élément visé par un lien « #demande-<id> » (clic sur une notification,
// une notification push, la bannière…).
//  - se déclenche à CHAQUE clic (même si une autre conversation est déjà ouverte) ;
//  - ne s'applique qu'une fois par clic : un choix fait ensuite à la main n'est pas écrasé ;
//  - si l'élément n'est pas encore connu (nouvelle demande, données pas chargées),
//    recharge les données (3 essais maximum) puis réessaie.
export default function useDeepLink({ hash, locationKey, ready, data, find, onFound, refresh }) {
  const handled = useRef(null)
  const attempts = useRef({ key: null, n: 0 })

  useEffect(() => {
    const id = hash.startsWith('#demande-') ? hash.slice('#demande-'.length) : null
    if (!id || !ready || handled.current === locationKey) return

    const target = find(id)
    if (target) {
      handled.current = locationKey
      onFound(target)
      return
    }
    if (attempts.current.key !== locationKey) attempts.current = { key: locationKey, n: 0 }
    if (attempts.current.n < 3) {
      attempts.current.n += 1
      refresh?.()
    }
  }, [hash, locationKey, ready, data])
}
