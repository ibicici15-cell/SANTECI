import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getListingById, incrementListingViews, incrementListingClicks, createContactRequest, fetchFavoriteIds, getAgencyProfile } from '../utils/db'
import { notifyCountsChanged } from '../utils/countsBus'
import { useAuth } from '../contexts/AuthContext'
import FavoriteButton from '../components/FavoriteButton'
import ReportButton from '../components/ReportButton'
import PhotoCarousel from '../components/PhotoCarousel'

function formatPrice(price) {
  if (price == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}
function formatDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return d }
}

export default function ListingDetail() {
  const { id } = useParams()
  const { traveler, agency } = useAuth()
  const [listing, setListing] = useState(null)
  const [agencyContact, setAgencyContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sent, setSent] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', travelers: 1, desiredDate: '', message: '', paymentReference: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getListingById(id).then(l => {
      setListing(l)
      setLoading(false)
      if (l) {
        incrementListingViews(id)
        getAgencyProfile(l.agencyId).then(setAgencyContact)
      }
    })
  }, [id])

  useEffect(() => {
    if (traveler) fetchFavoriteIds(traveler.id, 'listing').then(ids => setIsFavorited(ids.has(id)))
  }, [traveler?.id, id])

  // Préremplit le formulaire de contact avec les infos du profil voyageur
  useEffect(() => {
    if (traveler) {
      setForm(f => ({ ...f, name: traveler.name || f.name, phone: traveler.phone || f.phone, whatsapp: traveler.whatsapp || f.whatsapp }))
    }
  }, [traveler])

  async function handleContactClick() {
    incrementListingClicks(id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createContactRequest({
        listingId: id,
        agencyId: listing.agencyId,
        listingTitle: listing.title,
        travelerId: traveler?.id,
        travelerName: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        travelersCount: Number(form.travelers) || 1,
        desiredDate: form.desiredDate,
        message: form.message,
        paymentReference: form.paymentReference,
      })
      setSent(true)
      notifyCountsChanged()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-ink/60">Chargement…</div>
  if (!listing) return <div className="max-w-4xl mx-auto px-4 py-16 text-ink/60">Cette annonce n'existe pas ou plus.</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {listing.photos?.length > 0 ? (
        <PhotoCarousel photos={listing.photos} alt={listing.title}>
          <FavoriteButton
            targetType="listing" targetId={listing.id} targetLabel={listing.title}
            initialFavorited={isFavorited}
            className="absolute top-3 right-3 w-10 h-10 text-2xl bg-white/90 shadow-sm z-10"
          />
        </PhotoCarousel>
      ) : (
        <div className="flex items-center justify-between bg-stub rounded-2xl px-4 py-2.5">
          <span className="text-sm text-ink/60">
            {listing.offerType === 'billet' ? '🎫' : '🌍'} {listing.agencyName}
            {listing.agencyVerified && <span className="ml-2 text-green font-semibold">✓ Vérifiée</span>}
          </span>
          <FavoriteButton
            targetType="listing" targetId={listing.id} targetLabel={listing.title}
            initialFavorited={isFavorited} className="w-8 h-8 text-xl"
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-green font-semibold">
            {listing.destinationCountry}{listing.destinationCity ? ` · ${listing.destinationCity}` : ''}
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-1">{listing.title}</h1>
          <div className="text-ink/60 mt-2">
            Départ {listing.departureCity} · {formatDate(listing.departureDate)}
            {listing.offerType !== 'billet' && ` · ${listing.durationDays} jours`}
          </div>
          {listing.agencyName && (
            <div className="text-sm text-ink/60 mt-1">
              Publié par{' '}
              <Link to={`/agences/${listing.agencyId}`} className="font-medium text-ink hover:underline">
                {listing.agencyName}
              </Link>
              {listing.agencyVerified && <span className="ml-2 text-green font-semibold">✓ Agence vérifiée</span>}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-display font-bold text-2xl text-ink whitespace-nowrap">
            {formatPrice(listing.price)}
          </div>
          <ReportButton targetType="listing" targetId={listing.id} targetLabel={listing.title} className="mt-1" />
          <span className="text-ink/20 mx-1 text-xs">·</span>
          <Link to={`/agences/${listing.agencyId}#avis`} className="text-xs text-ink/55 hover:text-green underline">
            Laisser un avis
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-8 mt-8">
        <div>
          <h2 id="description" className="font-display font-semibold text-lg mb-2">Description</h2>
          <p className="text-ink/85 whitespace-pre-line">{listing.description || 'Aucune description fournie.'}</p>

          {listing.program && (
            <>
              <h2 id="programme" className="font-display font-semibold text-lg mt-6 mb-2">Programme</h2>
              <p className="text-ink/85 whitespace-pre-line">{listing.program}</p>
            </>
          )}
        </div>

        <div>
          {listing.offerType !== 'billet' && (
            <>
              <h2 className="font-display font-semibold text-lg mb-2">Services inclus</h2>
              <div className="flex flex-wrap gap-1.5">
                {(listing.servicesIncluded || []).map(s => (
                  <span key={s} className="chip chip-inactive cursor-default">{s}</span>
                ))}
                {(!listing.servicesIncluded || listing.servicesIncluded.length === 0) && (
                  <span className="text-ink/60 text-sm">Non précisé</span>
                )}
              </div>
            </>
          )}

          <div id="contact" className="mt-6 bg-white border border-ink/10 rounded-2xl p-5">
            <div className="text-sm text-ink/60">Places disponibles</div>
            <div className="font-display font-bold text-xl text-ink">{listing.availableSeats ?? '—'}</div>
            <button onClick={handleContactClick} className="btn-primary w-full mt-4">
              Contacter l'agence
            </button>
            {(agencyContact?.phone || agencyContact?.whatsapp) && (
              <div className="flex gap-2 mt-2">
                {agencyContact.phone && (
                  <a href={`tel:${agencyContact.phone}`} className="btn-outline flex-1 !py-2 text-sm text-center">
                    📞 Appeler
                  </a>
                )}
                {agencyContact.whatsapp && (
                  <a
                    href={`https://wa.me/${agencyContact.whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-outline flex-1 !py-2 text-sm text-center"
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          {agency && agency.id === listing.agencyId && (
            <div className="mt-4 bg-stub rounded-2xl p-4 flex flex-wrap gap-2">
              <Link to={`/agence/annonces/${listing.id}/modifier`} className="btn-outline !py-1.5 text-sm">
                Modifier cette annonce
              </Link>
              <Link to="/agence/annonces/nouvelle" className="btn-outline !py-1.5 text-sm">
                Publier une autre annonce
              </Link>
            </div>
          )}
        </div>
      </div>

      {showForm && !sent && (
        <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-md w-full max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-lg mb-4">Contacter {listing.agencyName || "l'agence"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Nom complet" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input required placeholder="Téléphone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
              <input placeholder="WhatsApp (optionnel)" value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="input" />
              <div className="flex gap-3">
                <input type="number" min="1" placeholder="Voyageurs" value={form.travelers}
                  onChange={(e) => setForm({ ...form, travelers: e.target.value })} className="input w-1/2" />
                <input type="date" value={form.desiredDate}
                  onChange={(e) => setForm({ ...form, desiredDate: e.target.value })} className="input w-1/2" />
              </div>
              <textarea placeholder="Message (optionnel)" value={form.message} rows={3}
                onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" />
              {agencyContact?.acceptedPaymentMethods?.length > 0 && (
                <div>
                  <p className="text-xs text-ink/60 mb-1">
                    Déjà payé via {agencyContact.acceptedPaymentMethods.join(', ')} ? Ajoute ta référence (optionnel).
                  </p>
                  <input placeholder="Référence de paiement" value={form.paymentReference}
                    onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} className="input" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Annuler</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Envoi…' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">✓</div>
            <h3 className="font-display font-semibold text-lg mb-2">Demande envoyée</h3>
            <p className="text-ink/60 text-sm mb-4">
              {traveler
                ? <>Suis la réponse de l'agence dans <Link to="/mes-demandes" className="underline font-semibold">Mes demandes</Link>.</>
                : "L'agence a reçu ta demande et te recontactera directement."}
            </p>
            <button onClick={() => { setShowForm(false); setSent(false) }} className="btn-primary w-full">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
