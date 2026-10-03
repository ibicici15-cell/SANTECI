// Fusionne, pour une conversation, le message initial du voyageur, la
// réponse historique de l'agence (colonne agency_reply) et tous les
// messages de la discussion (table request_messages), dans l'ordre.
export function buildTimeline(requests, chatMessages) {
  const items = []
  for (const r of requests) {
    if (r.message) {
      items.push({
        id: `req-${r.id}`, anchor: `demande-${r.id}`, from: 'traveler', text: r.message,
        at: r.createdAt, request: r,
      })
    }
    if (r.agencyReply) {
      items.push({
        id: `rep-${r.id}`, from: 'agency', text: r.agencyReply,
        at: r.repliedAt || new Date(new Date(r.createdAt).getTime() + 1).toISOString(),
      })
    }
  }
  const ids = new Set(requests.map(r => r.id))
  for (const m of chatMessages) {
    if (!ids.has(m.requestId)) continue
    items.push({ id: m.id, from: m.senderRole, text: m.body, at: m.createdAt })
  }
  return items.sort((a, b) => new Date(a.at) - new Date(b.at))
}

export function formatTime(dateStr) {
  const d = new Date(dateStr)
  const sameDay = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? time : `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${time}`
}
