import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ListingCard from '../components/ListingCard'
import FlightCard from '../components/FlightCard'
import Combobox from '../components/Combobox'
import { DEPARTURE_CITIES, DURATIONS, SORT_OPTIONS, FALLBACK_CATEGORIES, FALLBACK_DESTINATIONS } from '../data/categories'
import { fetchActiveListings, fetchFavoriteIds, fetchCategories, fetchDestinations } from '../utils/db'
import { searchFlights } from '../utils/flights'
import { useAuth } from '../contexts/AuthContext'

const TABS = [
  { id: 'tous', label: 'Tout' },
  { id: 'vols', label: '✈️ Vols' },
  { id: 'billets', label: '🎫 Billets' },
  { id: 'voyages', label: '🌍 Voyages' },
]

const FILTER_KEYS = ['destination', 'depart', 'type', 'duree', 'prixMin', 'prixMax', 'dateDepart', 'dateRetour']

export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const { traveler } = useAuth()
  const [billets, setBillets] = useState([])
  const [voyages, setVoyages] = useState([])
  const [flights, setFlights] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [categories, setCategories] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [loadingFlights, setLoadingFlights] = useState(false)

  useEffect(() => {
    fetchCategories().then(c => setCategories(c.length ? c : FALLBACK_CATEGORIES)).catch(() => setCategories(FALLBACK_CATEGORIES))
    fetchDestinations().then(d => setDestinations(d.length ? d : FALLBACK_DESTINATIONS)).catch(() => setDestinations(FALLBACK_DESTINATIONS))
  }, [])

  const origin = params.get('origine') || ''
  const destination = params.get('destination') || ''
  const departureCity = params.get('depart') || ''
  const dateDepart = params.get('dateDepart') || ''
  const dateRetour = params.get('dateRetour') || ''
  const type = params.get('type') || ''
  const duration = params.get('duree') || ''
  const priceMin = params.get('prixMin') || ''
  const priceMax = params.get('prixMax') || ''
  const sortBy = params.get('tri') || 'pertinence'
  const tab = params.get('vue') || 'tous'

  const durationRange = DURATIONS.find(d => d.id === duration)
  const activeFilterCount = FILTER_KEYS.filter(k => params.get(k)).length

  // Offres agences — filtres combinés en une seule requête Postgres,
  // billets et voyages récupérés séparément (jamais mélangés à l'affichage)
  useEffect(() => {
    setLoadingListings(true)
    const baseFilters = {
      destination, departureCity, type, priceMin, priceMax, dateDepart,
      durationMin: durationRange?.min, durationMax: durationRange?.max,
      sortBy,
    }
    Promise.all([
      fetchActiveListings({ ...baseFilters, offerType: 'billet' }),
      fetchActiveListings({ ...baseFilters, offerType: 'voyage' }),
    ])
      .then(([b, v]) => { setBillets(b); setVoyages(v) })
      .catch(() => { setBillets([]); setVoyages([]) })
      .finally(() => setLoadingListings(false))
  }, [destination, departureCity, type, priceMin, priceMax, duration, dateDepart, sortBy])

  // Vols — recherche séparée, jamais mélangée aux offres des agences
  useEffect(() => {
    const searchOrigin = origin || departureCity
    if (!searchOrigin || !destination) { setFlights([]); return }
    setLoadingFlights(true)
    searchFlights({ origin: searchOrigin, destination, departureDate: dateDepart })
      .then(setFlights)
      .catch(() => setFlights([]))
      .finally(() => setLoadingFlights(false))
  }, [origin, departureCity, destination, dateDepart])

  useEffect(() => {
    if (traveler) fetchFavoriteIds(traveler.id, 'listing').then(setFavoriteIds)
    else setFavoriteIds(new Set())
  }, [traveler?.id])

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next)
  }

  function resetFilters() {
    const next = new URLSearchParams(params)
    for (const k of FILTER_KEYS) next.delete(k)
    setParams(next)
  }

  const showFlights = tab === 'tous' || tab === 'vols'
  const showBillets = tab === 'tous' || tab === 'billets'
  const showVoyages = tab === 'tous' || tab === 'voyages'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Barre de filtres compacte, toujours visible : plusieurs contrôles
          sur une même ligne (qui s'enroule naturellement sur petit écran),
          chacun réduit à l'essentiel — pas de grand panneau qui s'ouvre/se
          ferme d'un bloc. */}
      <div className="flex flex-wrap items-end gap-2 mb-2">
        <div className="w-[calc(50%-0.25rem)] sm:w-44">
          <label className="text-[11px] font-semibold text-ink/60">Destination</label>
          <Combobox value={destination} onChange={(v) => setParam('destination', v)}
            options={destinations} placeholder="N'importe où" className="input !py-1.5 text-sm" />
        </div>

        <div className="w-[calc(50%-0.25rem)] sm:w-32">
          <label className="text-[11px] font-semibold text-ink/60">Départ de</label>
          <select value={departureCity} onChange={(e) => setParam('depart', e.target.value)} className="input !py-1.5 text-sm">
            <option value="">Toutes villes</option>
            {DEPARTURE_CITIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="w-[calc(50%-0.25rem)] sm:w-32">
          <label className="text-[11px] font-semibold text-ink/60">Type</label>
          <select value={type} onChange={(e) => setParam('type', e.target.value)} className="input !py-1.5 text-sm">
            <option value="">Tous types</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div className="w-[calc(50%-0.25rem)] sm:w-28">
          <label className="text-[11px] font-semibold text-ink/60">Durée</label>
          <select value={duration} onChange={(e) => setParam('duree', e.target.value)} className="input !py-1.5 text-sm">
            <option value="">Toutes</option>
            {DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        <div className="w-[calc(50%-0.25rem)] sm:w-32">
          <label className="text-[11px] font-semibold text-ink/60">Départ le</label>
          <input type="date" value={dateDepart} onChange={(e) => setParam('dateDepart', e.target.value)} className="input !py-1.5 text-sm" />
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-32">
          <label className="text-[11px] font-semibold text-ink/60">Retour le</label>
          <input type="date" value={dateRetour} onChange={(e) => setParam('dateRetour', e.target.value)} className="input !py-1.5 text-sm" />
        </div>

        <div className="w-[calc(50%-0.25rem)] sm:w-24">
          <label className="text-[11px] font-semibold text-ink/60">Budget min</label>
          <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setParam('prixMin', e.target.value)} className="input !py-1.5 text-sm" />
        </div>
        <div className="w-[calc(50%-0.25rem)] sm:w-24">
          <label className="text-[11px] font-semibold text-ink/60">Budget max</label>
          <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setParam('prixMax', e.target.value)} className="input !py-1.5 text-sm" />
        </div>

        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="text-xs font-semibold text-green hover:underline pb-2 whitespace-nowrap">
            Réinitialiser ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setParam('vue', t.id === 'tous' ? '' : t.id)}
              className={`chip ${tab === t.id ? 'chip-active' : 'chip-inactive'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={(e) => setParam('tri', e.target.value)} className="input w-auto !py-1.5 text-sm">
          {SORT_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Résultats */}
      <div id="resultats">
        {showFlights && (
          <section className="mb-10">
            <h2 className="font-display font-bold text-lg text-ink mb-1">✈️ Vols disponibles</h2>
            {!origin && !departureCity && !destination ? (
              <p className="text-sm text-ink/60 mb-3">Choisis une ville de départ et une destination pour voir les vols.</p>
            ) : (
              <p className="text-xs text-ink/55 mb-3">Comparateur en temps réel — prix susceptible de changer selon la disponibilité.</p>
            )}

            {loadingFlights && <p className="text-ink/60">Recherche des vols…</p>}

            {!loadingFlights && (origin || departureCity) && destination && flights.length === 0 && (
              <div className="border border-dashed border-ink/20 rounded-2xl p-6 text-center text-ink/60 text-sm">
                Aucun vol trouvé pour ce trajet.
              </div>
            )}

            <div className="grid gap-3">
              {flights.map(f => <FlightCard key={f.id} flight={f} />)}
            </div>
          </section>
        )}

        {/* Billets et voyages des agences : deux colonnes côte à côte sur
            grand écran, empilées verticalement sinon. Si un seul des deux
            onglets est actif, il prend toute la largeur. */}
        {(showBillets || showVoyages) && (
          <div className={`grid gap-8 ${showBillets && showVoyages ? 'lg:grid-cols-2' : ''}`}>
            {showBillets && (
              <section>
                <h2 className="font-display font-bold text-lg text-ink mb-1">🎫 Billets</h2>
                <p className="text-xs text-ink/55 mb-3">Billets vendus et gérés directement par une agence (prix fixé par elle) — à ne pas confondre avec la section Vols ci-dessus, alimentée en temps réel par les compagnies aériennes.</p>
                {loadingListings && <p className="text-ink/60">Recherche…</p>}
                {!loadingListings && billets.length === 0 && (
                  <div className="border border-dashed border-ink/20 rounded-2xl p-6 text-center text-ink/60 text-sm">
                    Aucun billet ne correspond à ces critères.
                  </div>
                )}
                <div className="grid gap-4">
                  {billets.map(l => <ListingCard key={l.id} listing={l} isFavorited={favoriteIds.has(l.id)} />)}
                </div>
              </section>
            )}

            {showVoyages && (
              <section>
                <h2 className="font-display font-bold text-lg text-ink mb-1">🌍 Voyages</h2>
                <p className="text-xs text-ink/55 mb-3">Prix défini par l'agence — distinct des tarifs des compagnies aériennes.</p>
                {loadingListings && <p className="text-ink/60">Recherche…</p>}
                {!loadingListings && voyages.length === 0 && (
                  <div className="border border-dashed border-ink/20 rounded-2xl p-6 text-center text-ink/60 text-sm">
                    Aucun voyage ne correspond à ces critères.
                  </div>
                )}
                <div className="grid gap-4">
                  {voyages.map(l => <ListingCard key={l.id} listing={l} isFavorited={favoriteIds.has(l.id)} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
