import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createContactMessage } from '../utils/db'
import Logo from '../components/Logo'

export default function Contact() {
  const { user, traveler, agency } = useAuth()
  const [form, setForm] = useState({
    name: traveler?.name || agency?.name || '', email: user?.email || '', message: '',
  })
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createContactMessage(form.name, form.email, form.message)
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="flex justify-center mb-8"><Logo className="h-9" /></div>
      <h1 className="font-display font-bold text-2xl text-ink text-center">Nous contacter</h1>
      <p className="text-ink/60 text-sm mt-1 text-center">
        Ton message part directement à l'équipe Agnini Sanfè.
      </p>

      {sent ? (
        <div className="mt-6 bg-green/10 border border-green/30 text-green rounded-xl p-4 text-sm text-center">
          Message envoyé, merci ! On te répond au plus vite.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 mt-6">
          <input required placeholder="Nom" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input required type="email" placeholder="E-mail" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <textarea required rows={5} placeholder="Ton message" value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Envoi…' : 'Envoyer'}
          </button>
        </form>
      )}
    </div>
  )
}
