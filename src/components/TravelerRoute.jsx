import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Protège les pages de l'espace voyageur (profil, favoris, demandes).
// N'exige que la session : le profil voyageur peut être encore "en
// attente" juste après confirmation d'e-mail (voir AuthContext).
export default function TravelerRoute({ children }) {
  const location = useLocation()
  const { user, loading } = useAuth()
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-ink/60">Chargement…</div>
  if (!user) return <Navigate to="/compte/connexion" state={{ from: location }} replace />
  return children
}
