import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Pages de connexion / inscription : on atterrit directement sur le
// formulaire (id="identifiants"), pas au milieu de la page précédente.
const FORM_TARGETS = {
  '/compte/connexion': 'identifiants',
  '/compte/inscription': 'identifiants',
  '/agence/connexion': 'identifiants',
  '/agence/inscription': 'identifiants',
  '/admin/connexion': 'identifiants',
}

const savedPositions = new Map()

// Attend (contenu chargé en asynchrone) que l'élément existe, puis y défile.
function scrollToId(id, { smooth }) {
  let tries = 0
  const timer = setInterval(() => {
    const el = document.getElementById(id)
    tries += 1
    if (el) {
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      clearInterval(timer)
    } else if (tries > 30) {
      clearInterval(timer) // ~3 s : ancre introuvable -> haut de page
      window.scrollTo(0, 0)
    }
  }, 100)
  return () => clearInterval(timer)
}

function restoreScroll(y) {
  let tries = 0
  const timer = setInterval(() => {
    tries += 1
    const max = document.documentElement.scrollHeight - window.innerHeight
    if (max >= y || tries > 12) {
      window.scrollTo(0, y)
      clearInterval(timer)
    }
  }, 100)
  return () => clearInterval(timer)
}

// Remplace l'ancien ScrollToHash. Règles :
//  - lien avec ancre (#section)  -> défile jusqu'à la section ;
//  - nouvelle page               -> retour en haut (avant : on restait
//                                   au bas de la page précédente) ;
//  - bouton retour               -> retrouve la position d'avant ;
//  - champ de formulaire touché  -> reste visible au-dessus du clavier.
export default function ScrollManager() {
  const location = useLocation()
  const navType = useNavigationType()
  const keyRef = useRef(location.key)

  useEffect(() => {
    keyRef.current = location.key
    const save = () => savedPositions.set(keyRef.current, window.scrollY)
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [location.key])

  useEffect(() => {
    // #demande-<id> : la page de messagerie se place elle-même sur le dernier message
    if (location.hash.startsWith('#demande-')) { window.scrollTo(0, 0); return }
    if (location.hash) return scrollToId(location.hash.slice(1), { smooth: true })
    if (navType === 'POP') return restoreScroll(savedPositions.get(location.key) ?? 0)

    window.scrollTo(0, 0)
    const formId = FORM_TARGETS[location.pathname]
    if (formId) return scrollToId(formId, { smooth: false })
  }, [location.key])

  useEffect(() => {
    function onFocus(e) {
      const el = e.target
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || window.innerWidth >= 1024) return
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  return null
}
