import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../utils/chatTimeline'

// Fil de discussion : bulles à gauche / à droite et zone d'écriture toujours
// disponible (collée en bas de l'écran). `role` = rôle de la personne qui
// regarde ('traveler' ou 'agency') ; `onSend(texte)` envoie le message.
export default function ChatThread({ items, role, onSend, otherLabel, renderExtra }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const lastId = items[items.length - 1]?.id

  // Toujours se placer sur le dernier message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastId])

  async function submit(e) {
    e?.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      await onSend(body)
      setText('')
    } catch (err) {
      console.error('Envoi du message :', err)
      const detail = String(err?.message || '')
      if (/request_messages|schema cache|does not exist/i.test(detail)) {
        setError("La messagerie n'est pas encore activée sur le serveur (migration SQL « migration_chat_messages.sql » à exécuter dans Supabase).")
      } else {
        setError(`Message non envoyé${detail ? ` : ${detail}` : '. Vérifie ta connexion puis réessaie.'}`)
      }
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }

  return (
    <div>
      <div className="space-y-2 py-3">
        {items.length === 0 && (
          <p className="text-center text-sm text-ink/55 py-6">Aucun message pour l'instant. Écris le premier !</p>
        )}
        {items.map(it => {
          const mine = it.from === role
          return (
            <div key={it.id} id={it.anchor} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap ${
                mine ? 'bg-green text-white rounded-br-md' : 'bg-stub text-ink rounded-bl-md'
              }`}>
                {!mine && otherLabel && <div className="text-[11px] font-semibold text-ink/55 mb-0.5">{otherLabel}</div>}
                {it.text}
                {renderExtra?.(it)}
                <div className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-ink/45'}`}>{formatTime(it.at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="chat-composer bg-white border-t border-ink/10 -mx-4 px-3 py-2 z-30">
        {error && <p className="text-xs text-red-600 mb-1.5 px-1">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown}
            rows={1} maxLength={2000} placeholder="Écrire un message…"
            className="input flex-1 !py-2.5 max-h-32 resize-none"
          />
          <button
            type="submit" disabled={sending || !text.trim()}
            aria-label="Envoyer"
            className="shrink-0 w-11 h-11 rounded-full bg-green text-white flex items-center justify-center disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
