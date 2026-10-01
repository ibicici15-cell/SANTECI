import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

export default function RouteProtegee({ rolesAutorises, children }) {
  const { utilisateur, role, loading, synchroniserSession } = useAuth()

  // Filet de sécurité : si le contexte dit "pas connecté" alors qu'on vient
  // tout juste de se connecter/inscrire ailleurs dans l'app, on revérifie
  // (avec plusieurs tentatives espacées, pour couvrir les latences réseau)
  // directement auprès de Supabase avant de rediriger pour de bon.
  const [enVerification, setEnVerification] = useState(!utilisateur)

  useEffect(() => {
    if (utilisateur || loading) { setEnVerification(false); return }
    let annule = false
    ;(async () => {
      for (let tentative = 0; tentative < 4 && !annule; tentative++) {
        const session = await synchroniserSession()
        if (session) break
        if (tentative < 3) await new Promise(resolve => setTimeout(resolve, 350))
      }
      if (!annule) setEnVerification(false)
    })()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || enVerification) return <Loader />
  if (!utilisateur) return <Navigate to="/connexion" replace />
  if (rolesAutorises && !rolesAutorises.includes(role)) return <Navigate to="/" replace />

  return children
}
