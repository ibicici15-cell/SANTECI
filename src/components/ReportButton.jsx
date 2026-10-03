import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createReport } from '../utils/db'

const REASONS = [
  { id: 'fraud', label: 'Arnaque / fraude' },
  { id: 'wrong_info', label: 'Informations trompeuses' },
  { id: 'inappropriate', label: 'Contenu inapproprié' },
  { id: 'other', label: 'Autre' },
]

export default function ReportButton({ targetType, targetId, targetLabel, className = '' }) {
  const { traveler } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0].id)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createReport({
        reporterId: traveler?.id, targetType, targetId, targetLabel, reason, message,
      })
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={`text-xs text-ink/55 hover:text-red-500 underline ${className}`}>
        Signaler
      </button>

      {open && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <>
                <h3 className="font-display font-semibold text-lg mb-2">Signalement envoyé</h3>
                <p className="text-sm text-ink/60 mb-4">Merci, l'équipe va l'examiner.</p>
                <button onClick={() => { setOpen(false); setSent(false) }} className="btn-primary w-full">Fermer</button>
              </>
            ) : (
              <>
                <h3 className="font-display font-semibold text-lg mb-4">Signaler « {targetLabel} »</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
                    {REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <textarea placeholder="Précise ce qui ne va pas (optionnel)" rows={3}
                    value={message} onChange={(e) => setMessage(e.target.value)} className="input" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setOpen(false)} className="btn-outline flex-1">Annuler</button>
                    <button type="submit" disabled={submitting} className="btn-primary flex-1">
                      {submitting ? 'Envoi…' : 'Envoyer'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
