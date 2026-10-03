import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAgencyProfile, fetchAgencyListingsPublic, fetchFavoriteIds } from '../utils/db'
import { useAuth } from '../contexts/AuthContext'
import ListingCard from '../components/ListingCard'
import FavoriteButton from '../components/FavoriteButton'
import ReportButton from '../components/ReportButton'
import StarRating from '../components/StarRating'
import AgencyReviews from '../components/AgencyReviews'

export default function AgencyProfile() {
  const { id } = useParams()
  const { traveler } = useAuth()
  const [agency, setAgency] = useState(null)
  const [listings, setListings] = useState([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteListingIds, setFavoriteListingIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getAgencyProfile(id),
      fetchAgencyListingsPublic(id),
      traveler ? fetchFavoriteIds(traveler.id, 'agency') : Promise.resolve(new Set()),
      traveler ? fetchFavoriteIds(traveler.id, 'listing') : Promise.resolve(new Set()),
    ]).then(([a, l, favIds, favListingIds]) => {
      setAgency(a)
      setListings(l)
      setIsFavorited(favIds.has(id))
      setFavoriteListingIds(favListingIds)
    }).finally(() => setLoading(false))
  }, [id, traveler?.id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-ink/60">Chargement…</div>
  if (!agency) return <div className="max-w-4xl mx-auto px-4 py-16 text-ink/60">Cette agence n'existe pas.</div>

  const billets = listings.filter(l => l.offerType === 'billet')
  const voyages = listings.filter(l => l.offerType !== 'billet')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">{agency.name}</h1>
            <FavoriteButton
              targetType="agency" targetId={agency.id} targetLabel={agency.name}
              initialFavorited={isFavorited} className="text-2xl w-8 h-8"
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            {agency.verified && <span className="text-green text-sm font-semibold">✓ Agence vérifiée</span>}
            {agency.reviewCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-ink/60">
                <StarRating value={Math.round(agency.ratingAvg)} readOnly size="text-sm" />
                {agency.ratingAvg} ({agency.reviewCount} avis)
              </span>
            )}
          </div>
          <div className="text-sm text-ink/60 mt-2">{agency.city}</div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-ink/85">
          {agency.phone && <div>📞 {agency.phone}</div>}
          {agency.whatsapp && <div>💬 WhatsApp : {agency.whatsapp}</div>}
          {agency.email && <div>✉️ {agency.email}</div>}
          {agency.openingHours && <div>🕒 {agency.openingHours}</div>}
          {agency.acceptedPaymentMethods?.length > 0 && <div>💳 {agency.acceptedPaymentMethods.join(', ')}</div>}
          <ReportButton targetType="agency" targetId={agency.id} targetLabel={agency.name} className="mt-1 self-start" />
        </div>
      </div>

      <section id="avis" className="mt-8 bg-white border border-ink/10 rounded-2xl p-5">
        <AgencyReviews agencyId={agency.id} />
      </section>

      {billets.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-lg text-ink mb-3">🎫 Billets</h2>
          <div className="grid gap-4">{billets.map(l => <ListingCard key={l.id} listing={l} isFavorited={favoriteListingIds.has(l.id)} />)}</div>
        </section>
      )}

      {voyages.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display font-semibold text-lg text-ink mb-3">🌍 Voyages</h2>
          <div className="grid gap-4">{voyages.map(l => <ListingCard key={l.id} listing={l} isFavorited={favoriteListingIds.has(l.id)} />)}</div>
        </section>
      )}

      {listings.length === 0 && (
        <p className="text-ink/60 mt-8">Cette agence n'a pas d'annonce active pour le moment.</p>
      )}
    </div>
  )
}
