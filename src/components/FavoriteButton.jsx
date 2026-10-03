import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addFavorite, removeFavorite } from '../utils/db'
import { notifyCountsChanged } from '../utils/countsBus'

export default function FavoriteButton({
  targetType, targetId, targetLabel, initialFavorited = false, className = '', onToggle,
}) {
  const { traveler } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [busy, setBusy] = useState(false)

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    if (!traveler) {
      navigate('/compte/connexion', { state: { from: location, notice: 'Connecte-toi pour ajouter cette offre à tes favoris.' } })
      return
    }

    setBusy(true)
    const next = !favorited
    setFavorited(next) // optimiste
    try {
      if (next) await addFavorite(traveler.id, targetType, targetId, targetLabel)
      else await removeFavorite(traveler.id, targetType, targetId)
      onToggle?.(next)
      notifyCountsChanged()
    } catch {
      setFavorited(!next) // on annule si ça échoue
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        favorited ? 'text-orange' : 'text-ink/55 hover:text-orange'
      } ${className}`}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}
