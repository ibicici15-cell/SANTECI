import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNotifications, fetchUnreadNotificationsCount, markNotificationRead,
  markAllNotificationsRead, subscribeToNotifications,
} from '../utils/db'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

export default function NotificationBell({ recipientId }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!recipientId) return
    fetchUnreadNotificationsCount(recipientId).then(setUnreadCount)
    const unsubscribe = subscribeToNotifications(recipientId, (n) => {
      setNotifications(list => [n, ...list])
      setUnreadCount(c => c + 1)
    })
    return unsubscribe
  }, [recipientId])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function toggleOpen() {
    const opening = !open
    setOpen(opening)
    if (opening) {
      const list = await fetchNotifications(recipientId)
      setNotifications(list)
    }
  }

  async function handleClickNotification(n) {
    if (!n.read) {
      await markNotificationRead(n.id)
      setNotifications(list => list.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnreadCount(c => Math.max(0, c - 1))
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(recipientId)
    setNotifications(list => list.map(x => ({ ...x, read: true })))
    setUnreadCount(0)
  }

  if (!recipientId) return null

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={toggleOpen} aria-label="Notifications" className="relative text-paper/80 hover:text-paper text-lg">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[calc(4rem+env(safe-area-inset-top))] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 max-h-96 overflow-y-auto bg-white text-ink rounded-xl shadow-lg border border-ink/10 z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/10">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-green font-semibold">Tout marquer comme lu</button>
            )}
          </div>

          {notifications.length === 0 && (
            <p className="text-sm text-ink/60 px-4 py-6 text-center">Aucune notification.</p>
          )}

          <div className="divide-y divide-ink/10">
            {notifications.map(n => (
              <button
                key={n.id} onClick={() => handleClickNotification(n)}
                className={`w-full text-left px-4 py-3 hover:bg-stub/50 transition-colors ${!n.read ? 'bg-orange/5' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                  <span className={`text-sm ${!n.read ? 'font-bold' : 'font-medium text-ink/85'}`}>{n.title}</span>
                </div>
                {n.message && <p className="text-xs text-ink/70 mt-0.5">{n.message}</p>}
                <span className="text-xs text-ink/55">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
