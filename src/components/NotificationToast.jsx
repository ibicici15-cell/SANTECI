import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToNotifications, markNotificationRead } from '../utils/db'
import Icon from './Icon'

// Bannière affichée quand une notification arrive PENDANT que l'app est
// ouverte (Android n'affiche alors pas de notification système : sans
// cette bannière, on ne voyait qu'un petit chiffre sur la cloche).
export default function NotificationToast() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    return subscribeToNotifications(user.id, (n) => setToast(n))
  }, [user?.id])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast) return null

  function open() {
    markNotificationRead(toast.id).catch(() => {})
    const link = toast.link
    setToast(null)
    if (link) navigate(link)
  }

  return (
    <button
      onClick={open}
      className="fixed left-3 right-3 top-[4.5rem] z-[60] flex items-start gap-3 text-left bg-white border border-ink/10 shadow-xl rounded-2xl p-3 animate-[page-in_0.2s_ease-out]"
    >
      <span className="w-9 h-9 shrink-0 rounded-full bg-orange/20 text-orange flex items-center justify-center">
        <Icon name="bell" className="w-5 h-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-sm text-ink">{toast.title}</span>
        {toast.message && <span className="block text-sm text-ink/70 line-clamp-2">{toast.message}</span>}
      </span>
    </button>
  )
}
