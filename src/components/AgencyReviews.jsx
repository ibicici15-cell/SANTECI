import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchAgencyReviews, getMyReviewForAgency, upsertReview, deleteReview } from '../utils/db'
import StarRating from './StarRating'

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

export default function AgencyReviews({ agencyId, showWriteSection = true }) {
  const { traveler, agency } = useAuth()
  const [reviews, setReviews] = useState([])
  const [myReview, setMyReview] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  async function load() {
    setLoading(true)
    const list = await fetchAgencyReviews(agencyId)
    setReviews(list)
    if (traveler) {
      const mine = await getMyReviewForAgency(agencyId, traveler.id)
      setMyReview(mine)
      if (mine) { setRating(mine.rating); setComment(mine.comment || '') }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [agencyId, traveler?.id])

  function startEditing() {
    if (myReview) { setRating(myReview.rating); setComment(myReview.comment || '') }
    else { setRating(0); setComment('') }
    setEditing(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) return
    setSaving(true)
    try {
      await upsertReview(agencyId, traveler.id, traveler.name, rating, comment)
      await load()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!myReview || !confirm('Supprimer ton avis ?')) return
    await deleteReview(myReview.id)
    setMyReview(null)
    setRating(0)
    setComment('')
    setEditing(false)
    load()
  }

  // Une agence connectée ne peut pas laisser d'avis (ni sur elle-même, ni
  // sur une autre) — on n'affiche ni formulaire ni invite à se connecter,
  // ce serait trompeur puisqu'elle EST déjà connectée, juste pas en tant
  // que voyageur.
  const canReview = showWriteSection && !agency

  return (
    <div>
      <h2 className="font-display font-semibold text-lg text-ink mb-3">
        Avis {!loading && reviews.length > 0 && `(${reviews.length})`}
      </h2>

      {canReview && (
        traveler ? (
          editing ? (
            <form onSubmit={handleSubmit} className="bg-white border border-ink/10 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold text-ink mb-1">
                {myReview ? 'Modifier mon avis' : 'Laisser un avis'}
              </div>
              <StarRating value={rating} onChange={setRating} />
              <textarea
                value={comment} onChange={(e) => setComment(e.target.value)}
                rows={2} placeholder="Ton expérience avec cette agence (optionnel)"
                className="input mt-2"
              />
              <div className="flex gap-2 mt-2">
                <button type="submit" disabled={saving || !rating} className="btn-primary !py-1.5 !px-4 text-sm">
                  {saving ? 'Envoi…' : myReview ? 'Mettre à jour' : 'Publier'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="text-sm text-ink/60">Annuler</button>
                {myReview && (
                  <button type="button" onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">
                    Supprimer mon avis
                  </button>
                )}
              </div>
            </form>
          ) : (
            <button onClick={startEditing} className="text-sm font-semibold text-green mb-4">
              {myReview ? 'Modifier mon avis' : 'Laisser un avis'}
            </button>
          )
        ) : (
          <p className="text-sm text-ink/60 mb-4">
            <Link to="/compte/connexion" className="text-green font-semibold">Connecte-toi</Link> pour laisser un avis.
          </p>
        )
      )}

      {loading && <p className="text-ink/60 text-sm">Chargement des avis…</p>}
      {!loading && reviews.length === 0 && (
        <p className="text-ink/60 text-sm">Aucun avis pour le moment.</p>
      )}

      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="border-b border-ink/10 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-ink">{r.travelerName}</span>
              <span className="text-xs text-ink/60">{formatDate(r.createdAt)}</span>
            </div>
            <StarRating value={r.rating} readOnly size="text-sm" />
            {r.comment && <p className="text-sm text-ink/85 mt-1">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
