import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { SERVICES, DEPARTURE_CITIES, OFFER_TYPES, FALLBACK_CATEGORIES, FALLBACK_DESTINATIONS } from '../data/categories'
import { createListing, updateListing, getListingById, fetchCategories, fetchDestinations, uploadListingPhoto, updateAgencyProfile } from '../utils/db'
import Combobox from '../components/Combobox'
import PublishingRules from '../components/PublishingRules'
import FormAlert from '../components/FormAlert'

const empty = {
  offerType: 'voyage',
  title: '', destinationCountry: '', destinationCity: '', departureCity: '',
  price: '', departureDate: '', durationDays: '', availableSeats: '',
  type: '', description: '', program: '', servicesIncluded: [], photos: [],
}

export default function AgencyListingForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user, agency, refreshAgency } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [categories, setCategories] = useState([])
  const [destinations, setDestinations] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories().then(c => setCategories(c.length ? c : FALLBACK_CATEGORIES)).catch(() => setCategories(FALLBACK_CATEGORIES))
    fetchDestinations().then(d => setDestinations(d.length ? d : FALLBACK_DESTINATIONS)).catch(() => setDestinations(FALLBACK_DESTINATIONS))
  }, [])

  useEffect(() => {
    if (isEdit) getListingById(id).then(l => l && setForm({ ...empty, ...l }))
  }, [id])

  function toggleService(s) {
    setForm(f => ({
      ...f,
      servicesIncluded: f.servicesIncluded.includes(s)
        ? f.servicesIncluded.filter(x => x !== s)
        : [...f.servicesIncluded, s],
    }))
  }

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState([]) // File[] sélectionnés, pas encore envoyés

  function selectPhotos(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const remaining = 5 - form.photos.length - pendingPhotos.length
    if (remaining <= 0) {
      setError('Maximum 5 photos par annonce.')
      e.target.value = ''
      return
    }
    setPendingPhotos(p => [...p, ...files.slice(0, remaining)])
    e.target.value = ''
  }

  function cancelPendingPhotos() {
    setPendingPhotos([])
  }

  async function confirmSendPhotos() {
    if (pendingPhotos.length === 0) return
    setUploadingPhoto(true)
    try {
      for (const file of pendingPhotos) {
        const url = await uploadListingPhoto(user.id, file)
        setForm(f => ({ ...f, photos: [...f.photos, url] }))
      }
      setPendingPhotos([])
    } finally {
      setUploadingPhoto(false)
    }
  }

  function removePhoto(index) {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }))
  }

  const isBillet = form.offerType === 'billet'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      ...form,
      type: isBillet ? 'billet' : form.type,
      price: Number(form.price) || 0,
      durationDays: isBillet ? 0 : (Number(form.durationDays) || 0),
      availableSeats: Number(form.availableSeats) || 0,
      agencyName: agency?.name || '',
      agencyVerified: agency?.verified || false,
    }
    try {
      if (isEdit) {
        await updateListing(id, payload)
      } else {
        await createListing(user.id, payload)
      }
      navigate('/agence/tableau-de-bord')
    } catch (err) {
      console.error('Erreur publication annonce :', err)
      if (err.code === 'QUOTA_EXCEEDED') {
        setError("Tu as atteint ton quota d'annonces de ce mois-ci. Passe à un abonnement Standard ou Premium, ou reviens le mois prochain.")
      } else {
        setError('Une erreur est survenue, réessaie.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-ink">
        {isEdit ? "Modifier l'annonce" : 'Publier une nouvelle annonce'}
      </h1>

      {agency && !agency.acceptedPublishingRules ? (
        <RulesGate agencyId={user.id} onAccepted={refreshAgency} />
      ) : (
        <>

      {!isEdit && (
        <div className="mt-6">
          <span className="text-sm font-semibold text-ink">Type d'offre</span>
          <div className="flex gap-2 mt-1.5">
            {OFFER_TYPES.map(o => (
              <button
                key={o.id} type="button"
                onClick={() => setForm({ ...form, offerType: o.id })}
                className={`chip ${form.offerType === o.id ? 'chip-active' : 'chip-inactive'}`}
              >
                {o.icon} {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/60 mt-1.5">
            {isBillet
              ? 'Un billet simple : trajet, date, prix. Pas de programme ni de services inclus.'
              : 'Un voyage packagé : séjour, circuit, pèlerinage, groupe, etc.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <Field label="Titre">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={isBillet ? 'Ex. : Billet Abidjan → Paris' : 'Ex. : Voyage à Dubaï — 7 jours'} className="input" />
        </Field>

        <Field label="Destination">
          <Combobox
            required value={form.destinationCountry}
            onChange={(v) => setForm({ ...form, destinationCountry: v })}
            options={destinations} placeholder="Ex. : Dubaï, Paris, Maroc…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville de départ">
            <select required value={form.departureCity}
              onChange={(e) => setForm({ ...form, departureCity: e.target.value })} className="input">
              <option value="">Choisir</option>
              {DEPARTURE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {!isBillet && (
            <Field label="Type de voyage">
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                <option value="">Choisir</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div className={`grid ${isBillet ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
          <Field label="Prix (FCFA)">
            <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" />
          </Field>
          {!isBillet && (
            <Field label="Durée (jours)">
              <input required type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="input" />
            </Field>
          )}
          <Field label="Places dispo.">
            <input type="number" value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} className="input" />
          </Field>
        </div>

        <Field label="Date de départ">
          <input required type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} className="input" />
        </Field>

        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
        </Field>

        {!isBillet && (
          <>
            <Field label="Programme (optionnel)">
              <textarea rows={4} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} className="input" />
            </Field>

            <Field label="Services inclus">
              <div className="flex flex-wrap gap-1.5">
                {SERVICES.map(s => (
                  <button type="button" key={s} onClick={() => toggleService(s)}
                    className={`chip ${form.servicesIncluded.includes(s) ? 'chip-active' : 'chip-inactive'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        <Field label="Photos (5 max)">
          <input
            type="file" accept="image/*" multiple onChange={selectPhotos} disabled={uploadingPhoto || form.photos.length >= 5}
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-stub file:text-ink file:text-sm disabled:opacity-40"
          />
          {pendingPhotos.length > 0 && (
            <div className="mt-2 flex items-center justify-between bg-stub rounded-lg p-2">
              <span className="text-xs text-ink/85">{pendingPhotos.length} photo(s) sélectionnée(s), pas encore envoyée(s)</span>
              <div className="flex gap-2">
                <button type="button" onClick={cancelPendingPhotos} className="text-xs text-ink/60">Annuler</button>
                <button type="button" onClick={confirmSendPhotos} disabled={uploadingPhoto} className="text-xs font-semibold text-green">
                  {uploadingPhoto ? 'Envoi…' : "Confirmer l'envoi"}
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {form.photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt="" className="w-16 h-16 object-cover rounded-lg" />
                <button type="button" onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none">
                  ×
                </button>
              </div>
            ))}
          </div>
        </Field>

        {error && <FormAlert>{error}</FormAlert>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : "Publier l'annonce"}
        </button>
      </form>
      </>
      )}
    </div>
  )
}

function RulesGate({ agencyId, onAccepted }) {
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    setSaving(true)
    try {
      await updateAgencyProfile(agencyId, {
        accepted_publishing_rules: true,
        publishing_rules_accepted_at: new Date().toISOString(),
      })
      await onAccepted()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6 bg-white border border-ink/10 rounded-2xl p-5">
      <PublishingRules />
      <label className="flex items-start gap-2 text-sm text-ink/80 mt-4">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
        J'accepte les règles de publication et m'engage à ne proposer que des offres conformes à celles-ci.
      </label>
      <button onClick={handleContinue} disabled={!checked || saving} className="btn-primary w-full mt-4 disabled:opacity-40">
        {saving ? 'Enregistrement…' : 'Continuer'}
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}
