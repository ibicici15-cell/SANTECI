import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ListingCard from '../components/ListingCard'
import { DEPARTURE_CITIES, FALLBACK_CATEGORIES, FALLBACK_DESTINATIONS } from '../data/categories'
import { fetchActiveListings, fetchFavoriteIds, fetchCategories, fetchDestinations } from '../utils/db'
import { useAuth } from '../contexts/AuthContext'
import Combobox from '../components/Combobox'

export default function Home() {
  const navigate = useNavigate()
  const { traveler } = useAuth()
  const [origin, setOrigin] = useState('Abidjan')
  const [destination, setDestination] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [dateRetour, setDateRetour] = useState('')
  const [travelers, setTravelers] = useState(1)
  const [billets, setBillets] = useState([])
  const [voyages, setVoyages] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [categories, setCategories] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchActiveListings({ offerType: 'billet' }),
      fetchActiveListings({ offerType: 'voyage' }),
    ])
      .then(([b, v]) => { setBillets(b.slice(0, 6)); setVoyages(v.slice(0, 6)) })
      .catch(() => { setBillets([]); setVoyages([]) })
      .finally(() => setLoading(false))
    fetchCategories().then(c => setCategories(c.length ? c : FALLBACK_CATEGORIES)).catch(() => setCategories(FALLBACK_CATEGORIES))
    fetchDestinations().then(d => setDestinations(d.length ? d : FALLBACK_DESTINATIONS)).catch(() => setDestinations(FALLBACK_DESTINATIONS))
  }, [])

  useEffect(() => {
    if (traveler) fetchFavoriteIds(traveler.id, 'listing').then(setFavoriteIds)
    else setFavoriteIds(new Set())
  }, [traveler?.id])

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (origin) params.set('origine', origin)
    if (destination) params.set('destination', destination)
    if (dateDepart) params.set('dateDepart', dateDepart)
    if (dateRetour) params.set('dateRetour', dateRetour)
    if (travelers) params.set('voyageurs', travelers)
    navigate(`/recherche?${params.toString()}#resultats`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
          <div className="font-mono text-xs tracking-[0.3em] text-orange uppercase mb-4">
            Embarquement immédiat
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl leading-tight max-w-2xl">
            Où voulez-vous aller ?
          </h1>
          <p className="text-paper/70 mt-4 max-w-xl">
            Comparez les vols disponibles et découvrez les offres des agences de
            voyage ivoiriennes, au même endroit.
          </p>

          <form id="recherche" onSubmit={handleSearch} className="mt-8 bg-paper rounded-2xl p-3 grid sm:grid-cols-5 gap-2 max-w-3xl text-ink">
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="input !py-2">
              {DEPARTURE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Combobox
              value={destination} onChange={setDestination}
              options={destinations} placeholder="Destination — tape n'importe où dans le monde"
              className="input !py-2"
            />
            <input type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)}
              className="input !py-2" title="Date de départ" />
            <input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)}
              className="input !py-2" title="Date de retour" />
            <button type="submit" className="btn-primary !py-2">Rechercher</button>
          </form>
          <div className="mt-2 flex items-center gap-2 text-sm text-paper/70">
            <label htmlFor="voyageurs">Voyageurs :</label>
            <input
              id="voyageurs" type="number" min="1" value={travelers}
              onChange={(e) => setTravelers(e.target.value)}
              className="w-16 bg-transparent border border-paper/30 rounded-lg px-2 py-1 text-paper focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="max-w-6xl mx-auto px-4 mt-10">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/recherche?type=${c.id}#resultats`)}
              className="chip chip-inactive whitespace-nowrap"
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Offres récentes : billets et voyages côte à côte, comme dans les
          résultats de recherche complets */}
      <section id="offres" className="max-w-6xl mx-auto px-4 mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-ink">Offres des agences récemment publiées</h2>
          <button onClick={() => navigate('/recherche#resultats')} className="text-sm text-green font-semibold hover:underline">
            Voir tout
          </button>
        </div>

        {loading && <p className="text-ink/60 mt-6">Chargement des offres…</p>}

        {!loading && billets.length === 0 && voyages.length === 0 && (
          <div className="mt-6 border border-dashed border-ink/20 rounded-2xl p-10 text-center text-ink/60">
            Aucune offre publiée pour le moment. Les agences qui s'inscrivent
            apparaîtront ici dès leur première annonce.
          </div>
        )}

        {!loading && (billets.length > 0 || voyages.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-8 mt-6">
            <div>
              <h3 className="font-display font-semibold text-ink mb-3">🎫 Billets</h3>
              {billets.length === 0
                ? <p className="text-sm text-ink/60">Aucun billet pour le moment.</p>
                : <div className="grid gap-4">{billets.map(l => <ListingCard key={l.id} listing={l} isFavorited={favoriteIds.has(l.id)} />)}</div>}
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink mb-3">🌍 Voyages</h3>
              {voyages.length === 0
                ? <p className="text-sm text-ink/60">Aucun voyage pour le moment.</p>
                : <div className="grid gap-4">{voyages.map(l => <ListingCard key={l.id} listing={l} isFavorited={favoriteIds.has(l.id)} />)}</div>}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
