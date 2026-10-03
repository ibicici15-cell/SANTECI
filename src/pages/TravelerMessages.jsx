import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchTravelerRequests, fetchChatMessages, sendChatMessage, subscribeToChatMessages } from '../utils/db'
import ChatThread from '../components/ChatThread'
import useDeepLink from '../utils/useDeepLink'
import { buildTimeline } from '../utils/chatTimeline'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function TravelerMessages() {
  const { traveler } = useAuth()
  const { hash, key: locationKey } = useLocation()
  const refreshRef = useRef(null)
  const [requests, setRequests] = useState([])
  const [chat, setChat] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState(null)

  // Chargement initial, puis rafraîchissement automatique : la réponse « officielle »
  // de l'agence (colonne agency_reply) n'arrive pas en direct, on revérifie donc
  // régulièrement tant que la page est ouverte.
  useEffect(() => {
    if (!traveler) return
    let cancelled = false
    async function refresh() {
      const reqs = await fetchTravelerRequests(traveler.id)
      // la table des messages peut ne pas encore exister : on n'en fait pas planter la page
      const msgs = await fetchChatMessages(reqs.map(r => r.id)).catch(() => [])
      if (cancelled) return
      setRequests(reqs)
      setChat(msgs)
    }
    refreshRef.current = () => refresh().catch(() => {})
    refresh().catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    const tick = () => { if (document.visibilityState === 'visible') refresh().catch(() => {}) }
    const timer = setInterval(tick, 6000)
    document.addEventListener('visibilitychange', tick)
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [traveler?.id])

  // Nouveaux messages de l'agence, en direct
  const requestIdsRef = useRef(new Set())
  requestIdsRef.current = new Set(requests.map(r => r.id))
  useEffect(() => {
    if (!traveler) return
    return subscribeToChatMessages((m) => {
      if (!requestIdsRef.current.has(m.requestId)) return
      setChat(list => (list.some(x => x.id === m.id) ? list : [...list, m]))
    })
  }, [traveler?.id])

  // Regroupe par agence + annonce : plusieurs demandes séparées vers la
  // même offre deviennent une seule conversation.
  const conversations = useMemo(() => {
    const map = new Map()
    for (const r of requests) {
      const key = `${r.agencyId}__${r.listingId || r.listingTitle}`
      if (!map.has(key)) {
        map.set(key, { key, listingTitle: r.listingTitle, messages: [], latestAt: r.createdAt, awaitingReply: false })
      }
      const c = map.get(key)
      c.messages.push(r)
      if (new Date(r.createdAt) > new Date(c.latestAt)) c.latestAt = r.createdAt
      if (!r.agencyReply) c.awaitingReply = true
    }
    for (const c of map.values()) c.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    return Array.from(map.values()).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
  }, [requests])

  // Lien profond (notification) : #demande-<id> ouvre la bonne conversation, à chaque clic.
  useDeepLink({
    hash, locationKey, ready: !loading, data: conversations,
    find: (id) => conversations.find(conv => conv.messages.some(m => m.id === id)),
    onFound: (c) => setSelectedKey(c.key),
    refresh: () => refreshRef.current?.(),
  })

  const selected = conversations.find(c => c.key === selectedKey) || null
  const timeline = selected ? buildTimeline(selected.messages, chat) : []

  async function sendMessage(body) {
    const target = selected.messages[selected.messages.length - 1]
    const msg = await sendChatMessage(target.id, 'traveler', traveler.id, body)
    setChat(list => (list.some(x => x.id === msg.id) ? list : [...list, msg]))
  }

  if (!traveler) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/60">Chargement du profil…</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-ink mb-1">Messages</h1>
      <p className="text-ink/60 text-sm mb-4">Le suivi des agences que tu as contactées depuis Agnini Sanfè.</p>

      {loading && <p className="text-ink/60">Chargement…</p>}

      {!loading && conversations.length === 0 && (
        <div className="border border-dashed border-ink/20 rounded-2xl p-10 text-center text-ink/60">
          Tu n'as encore contacté aucune agence. <Link to="/recherche" className="text-green font-semibold">Explorer les offres</Link>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="grid md:grid-cols-[280px_1fr] border border-ink/10 rounded-2xl overflow-hidden bg-white min-h-[380px]">
          <div className={`border-r border-ink/10 divide-y divide-ink/10 overflow-y-auto ${selected ? 'hidden md:block' : ''}`}>
            {conversations.map(c => (
              <button
                key={c.key} onClick={() => setSelectedKey(c.key)}
                className={`w-full text-left px-4 py-3 hover:bg-stub/50 transition-colors ${selectedKey === c.key ? 'bg-stub' : ''} ${c.awaitingReply ? 'bg-orange/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate ${c.awaitingReply ? 'font-semibold text-ink' : 'text-ink/80'}`}>
                    {c.awaitingReply && <span className="w-2 h-2 rounded-full bg-orange inline-block mr-1.5" />}
                    {c.listingTitle}
                  </span>
                  <span className="text-xs text-ink/55 shrink-0">{timeAgo(c.latestAt)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={selected ? '' : 'hidden md:flex md:items-center md:justify-center'}>
            {!selected && <p className="text-ink/55 text-sm">Sélectionnez une conversation.</p>}

            {selected && (
              <div className="p-4">
                <button onClick={() => setSelectedKey(null)} className="md:hidden text-sm text-green font-semibold mb-3">← Retour</button>
                <div className="font-display font-bold text-lg text-ink pb-3 border-b border-ink/10">{selected.listingTitle}</div>

                <ChatThread key={selected.key} items={timeline} role="traveler" otherLabel="Agence" onSend={sendMessage} />

                <Link to="/mon-casier" className="inline-block text-sm text-green font-semibold mt-3 mb-2">
                  📄 Voir les documents reçus dans Mon casier
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
