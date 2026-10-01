import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { definirNavigation } from '../lib/navigationRef'
import { initialiserPush } from '../lib/push'

/**
 * Composant "invisible" : relie react-router au module push (pour pouvoir
 * naviguer au tap sur une notification) et enregistre l'appareil pour les
 * push dès qu'un utilisateur est connecté. Ne rend rien à l'écran.
 */
export default function InitialisationPush() {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()

  useEffect(() => { definirNavigation(navigate) }, [navigate])

  useEffect(() => {
    if (utilisateur?.id) initialiserPush(utilisateur.id)
  }, [utilisateur?.id])

  return null
}
