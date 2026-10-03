import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute({ children }) {
  const location = useLocation()
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-ink/60">Chargement…</div>
  if (!user || !isAdmin) return <Navigate to="/admin/connexion" state={{ from: location }} replace />
  return children
}
