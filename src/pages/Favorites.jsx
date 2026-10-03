import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchFavorites, removeFavorite, getListingById } from '../utils/db'
import ListingCard from '../components/ListingCard'

const TABS = [
  { id: 'listing', label: 'Annonces' },
  { id: 'agency', label: 'Agences' },
]

export default function Favorites() {
  const { traveler } = useAuth()
  const [tab, setTab] = useState('listing')
  const [listings, setListings] = useState([])
  const [agencyFavs, setAgencyFavs] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!traveler) return
    setLoading(true)
    const [listingFavs, agencies] = await Promise.all([
      fetchFavorites(traveler.id, 'listing'),
      fetchFavorites(traveler.id, 'agency'),
    ])
    const listingDetails = (await Promise.all(
      listingFavs.map(f => getListingById(f.targetId).catch(() => null))
    )).filter(Boolean)
    setListings(listingDetails)
    setAgencyFavs(agencies)
    setLoading(false)
  }

  useEffect(() => { load() }, [traveler?.id])

  async function unfavoriteAgency(targetId) {
    await removeFavorite(traveler.id, 'agency', targetId)
    load()
  }

  if (!traveler) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-ink/60">Chargement du profil…</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-ink mb-4">Mes favoris</h1>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip ${tab === t.id ? 'chip-active' : 'chip-inactive'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}

      {/* isFavorited=true partout ici : ce sont par définition des
          favoris. Sans ce prop explicite, le cœur s'affichait comme
          "non favori" et cliquer dessus tentait de le RE-favoriser au
          lieu de le retirer. */}
      {!loading && tab === 'listing' && (
        listings.length === 0
          ? <EmptyState text="Aucune annonce en favoris pour le moment." />
          : <div className="grid gap-4">{listings.map(l => (
              <ListingCard key={l.id} listing={l} isFavorited
                onFavoriteToggle={(fav) => { if (!fav) setListings(ls => ls.filter(x => x.id !== l.id)) }}
              />
            ))}</div>
      )}

      {!loading && tab === 'agency' && (
        agencyFavs.length === 0
          ? <EmptyState text="Aucune agence en favoris pour le moment." />
          : (
            <div className="space-y-2">
              {agencyFavs.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-white border border-ink/10 rounded-xl px-4 py-3">
                  <Link to={`/agences/${f.targetId}`} className="font-medium text-ink hover:underline">
                    {f.targetLabel || 'Agence'}
                  </Link>
                  <button onClick={() => unfavoriteAgency(f.targetId)} className="text-sm text-red-500">Retirer</button>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="border border-dashed border-ink/20 rounded-2xl p-10 text-center text-ink/60">
      {text}
    </div>
  )
}
