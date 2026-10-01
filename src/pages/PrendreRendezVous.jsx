import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { libelleSpecialite, formaterFCFA, MOYENS_PAIEMENT } from '../lib/constantes'
import Loader from '../components/Loader'
import SelectAvecAutre from '../components/SelectAvecAutre'

// Important : on NE PEUT PAS utiliser `date.toISOString().split('T')[0]` ici,
// car toISOString() convertit en UTC — pour un fuseau horaire différent de
// UTC+0, ça peut décaler la date d'un jour (notamment le matin), ce qui
// faussait ensuite toute la recherche de créneaux disponibles.
function formaterDateLocale(date) {
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

function dateISOAujourdhui() {
  return formaterDateLocale(new Date())
}

function dateISODansNJours(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return formaterDateLocale(d)
}

export default function PrendreRendezVous() {
  const { professionnelId } = useParams()
  const { utilisateur } = useAuth()
  const navigate = useNavigate()

  const [pro, setPro] = useState(null)
  const [horaires, setHoraires] = useState([])
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)

  const [dateChoisie, setDateChoisie] = useState(dateISOAujourdhui())
  const [creneauxPris, setCreneauxPris] = useState(new Set())
  const [chargementCreneaux, setChargementCreneaux] = useState(false)
  const [erreurCreneaux, setErreurCreneaux] = useState('')

  const [form, setForm] = useState({
    heure: '', mode: 'cabinet', motif: '', moyen_paiement_choisi: '',
  })

  useEffect(() => {
    (async () => {
      const [{ data: proData }, { data: horairesData }] = await Promise.all([
        supabase.from('professionnels').select('*').eq('id', professionnelId).maybeSingle(),
        supabase.from('horaires_disponibilite').select('*').eq('professionnel_id', professionnelId),
      ])
      setPro(proData)
      setHoraires(horairesData || [])
      if (proData?.modes_consultation?.length) setForm(f => ({ ...f, mode: proData.modes_consultation[0] }))
      setChargement(false)
      // La date par défaut reste toujours aujourd'hui. Si aucun créneau n'y
      // est disponible, le bouton "Voir la prochaine disponibilité" permet
      // d'avancer manuellement — pas de saut automatique surprenant.
    })()
  }, [professionnelId])

  const chargerCreneauxPris = useCallback(async () => {
    setChargementCreneaux(true)
    setErreurCreneaux('')
    const debutJournee = new Date(`${dateChoisie}T00:00:00`).toISOString()
    const finJournee = new Date(`${dateChoisie}T23:59:59`).toISOString()

    // On passe par une fonction RPC dédiée : la RLS sur "rendez_vous" ne
    // laisse un patient voir que SES PROPRES rendez-vous, donc une requête
    // directe ne détecterait jamais les créneaux pris par d'autres patients.
    const { data, error } = await supabase.rpc('creneaux_pris', {
      p_professionnel_id: professionnelId,
      p_debut: debutJournee,
      p_fin: finJournee,
    })

    if (error) {
      // Important : si cette fonction échoue silencieusement (ex : le
      // script supabase/mise_a_jour_4.sql n'a pas été exécuté), il ne faut
      // JAMAIS laisser croire que tous les créneaux sont libres.
      console.error('[creneaux_pris]', error)
      setErreurCreneaux(
        `Impossible de vérifier les créneaux déjà pris (${error.message || error.code || 'erreur inconnue'}). ` +
        'Par sécurité, la réservation est bloquée.'
      )
      setCreneauxPris(null)
      setChargementCreneaux(false)
      return
    }

    // On repasse chaque date par un objet Date puis .toISOString() pour
    // garantir un format strictement identique à celui utilisé plus bas.
    setCreneauxPris(new Set((data || []).map(r => new Date(r.date_heure).toISOString())))
    setChargementCreneaux(false)
  }, [professionnelId, dateChoisie])

  useEffect(() => { chargerCreneauxPris() }, [chargerCreneauxPris])

  const allerAuProchainJourDisponible = () => {
    const joursAvecHoraires = new Set(horaires.map(h => h.jour_semaine))
    if (joursAvecHoraires.size === 0) return
    const dateDepart = new Date(`${dateChoisie}T12:00:00`)
    for (let i = 1; i <= 60; i++) {
      const d = new Date(dateDepart)
      d.setDate(d.getDate() + i)
      if (joursAvecHoraires.has(d.getDay())) {
        setDateChoisie(formaterDateLocale(d))
        setForm(f => ({ ...f, heure: '' }))
        return
      }
    }
  }

  const creneauxDuJour = useMemo(() => {
    if (!creneauxPris) return [] // vérification pas encore fiable → aucun créneau proposé
    const jourSemaine = new Date(`${dateChoisie}T12:00:00`).getDay()
    const horairesJour = horaires.filter(h => h.jour_semaine === jourSemaine)
    const maintenant = new Date()

    const creneaux = []
    for (const h of horairesJour) {
      const debut = parseInt(h.heure_debut.slice(0, 2), 10)
      const fin = parseInt(h.heure_fin.slice(0, 2), 10)
      for (let heure = debut; heure < fin; heure++) {
        const dateHeureLocale = new Date(`${dateChoisie}T${String(heure).padStart(2, '0')}:00:00`)
        if (dateHeureLocale <= maintenant) continue // pas de créneau dans le passé
        const iso = dateHeureLocale.toISOString()
        if (creneauxPris.has(iso)) continue // déjà demandé/confirmé → disparaît complètement
        creneaux.push({ heure, iso })
      }
    }
    return creneaux.sort((a, b) => a.heure - b.heure)
  }, [horaires, dateChoisie, creneauxPris])

  if (chargement) return <Loader />
  if (!pro) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-ardoise">Professionnel introuvable.</div>

  if (!pro.valide_par_admin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-ardoise">Ce professionnel est en attente de validation et ne peut pas encore recevoir de rendez-vous.</p>
        <Link to="/recherche" className="text-foret font-semibold">Retour à la recherche</Link>
      </div>
    )
  }

  const moyens = MOYENS_PAIEMENT.filter(m => pro.moyens_paiement?.includes(m.valeur))

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')
    if (!form.heure) { setErreur('Merci de choisir un créneau disponible.'); return }
    setEnvoi(true)

    const salle = form.mode === 'teleconsultation' ? `sante-ci-${crypto.randomUUID()}` : null

    const { error } = await supabase.from('rendez_vous').insert({
      patient_id: utilisateur.id,
      professionnel_id: pro.id,
      date_heure: form.heure,
      mode: form.mode,
      motif: form.motif,
      moyen_paiement_choisi: form.moyen_paiement_choisi || null,
      salle_teleconsultation: salle,
    })

    setEnvoi(false)

    if (error) {
      // Un autre patient a réservé exactement ce créneau entre-temps
      if (error.code === '23505') {
        setErreur('Ce créneau vient d\'être réservé par un autre patient. Choisissez-en un autre.')
        chargerCreneauxPris()
        setForm(f => ({ ...f, heure: '' }))
      } else {
        setErreur(error.message)
      }
      return
    }

    // Crée automatiquement la conversation avec ce professionnel (si elle
    // n'existe pas déjà), pour permettre d'échanger dès la demande de RDV,
    // même avant confirmation.
    await supabase.from('conversations')
      .upsert({ patient_id: utilisateur.id, professionnel_id: pro.id }, { onConflict: 'patient_id,professionnel_id', ignoreDuplicates: true })

    setSucces(true)
    setTimeout(() => navigate('/patient/rendez-vous'), 1500)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-charbon">Prendre rendez-vous</h1>
      <p className="text-ardoise text-sm mt-1">
        avec Dr {pro.prenom} {pro.nom} — {libelleSpecialite(pro.specialite)} · {formaterFCFA(pro.tarif_consultation)}
      </p>

      {succes ? (
        <div className="carte p-6 mt-6 text-center">
          <p className="font-display font-semibold text-lg text-foret">Demande envoyée !</p>
          <p className="text-ardoise text-sm mt-1">Le professionnel confirmera votre rendez-vous prochainement.</p>
        </div>
      ) : (
        <form onSubmit={soumettre} className="carte p-6 mt-6 space-y-4">
          {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}
          {erreurCreneaux && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreurCreneaux}</p>}

          <div>
            <label className="etiquette">Mode de consultation</label>
            <div className="flex gap-3">
              {pro.modes_consultation?.map(m => (
                <button
                  type="button" key={m}
                  onClick={() => setForm(f => ({ ...f, mode: m }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${form.mode === m ? 'border-foret bg-foret-light text-foret-dark' : 'border-ligne text-ardoise'}`}
                >
                  {m === 'cabinet' ? 'Au cabinet' : 'Téléconsultation'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="etiquette">Date</label>
            <input
              type="date" className="champ"
              min={dateISOAujourdhui()} max={dateISODansNJours(60)}
              value={dateChoisie}
              onChange={e => { setDateChoisie(e.target.value); setForm(f => ({ ...f, heure: '' })) }}
            />
          </div>

          <div>
            <label className="etiquette">Créneau disponible</label>
            {chargementCreneaux ? (
              <p className="text-sm text-ardoise">Chargement des créneaux…</p>
            ) : horaires.length === 0 ? (
              <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">
                Ce professionnel n'a pas encore renseigné ses disponibilités : la prise de rendez-vous
                n'est pas possible pour le moment. Réessayez plus tard ou contactez-le directement.
              </p>
            ) : creneauxDuJour.length === 0 && !erreurCreneaux ? (
              <div className="text-sm text-ardoise bg-charbon/5 rounded-lg px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
                <span>Aucun créneau libre ce jour-là (complet ou hors horaires).</span>
                <button type="button" onClick={allerAuProchainJourDisponible} className="text-foret font-semibold shrink-0">
                  Voir la prochaine disponibilité →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {creneauxDuJour.map(c => (
                  <button
                    type="button" key={c.iso}
                    onClick={() => setForm(f => ({ ...f, heure: c.iso }))}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.heure === c.iso
                        ? 'border-foret bg-foret text-white'
                        : 'border-ligne text-charbon hover:border-foret'
                    }`}
                  >
                    {String(c.heure).padStart(2, '0')}h-{String(c.heure + 1).padStart(2, '0')}h
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="etiquette">Motif de consultation (facultatif)</label>
            <textarea rows={3} className="champ" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} />
          </div>

          {moyens.length > 0 && (
            <div>
              <label className="etiquette">Moyen de paiement (à régler directement avec le professionnel)</label>
              <SelectAvecAutre optionVide="Sélectionner…" options={moyens} value={form.moyen_paiement_choisi}
                onChange={v => setForm(f => ({ ...f, moyen_paiement_choisi: v }))} placeholderAutre="Précisez le moyen de paiement" />
            </div>
          )}

          <button disabled={envoi || !form.heure || !!erreurCreneaux} className="btn-primaire w-full">
            {envoi ? 'Envoi…' : 'Confirmer la demande de rendez-vous'}
          </button>
        </form>
      )}
    </div>
  )
}
