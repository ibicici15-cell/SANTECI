import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import CarteRendezVous from './CarteRendezVous'
import useEntitesNonLues from '../hooks/useEntitesNonLues'
import { marquerEntiteLue } from '../lib/notifications'

const STATUTS_TERMINES = ['annule', 'refuse', 'termine']
const LIEN = '/patient/rendez-vous'

// Ne pas utiliser toISOString() ici : ça convertit en UTC et peut décaler
// la date d'un jour selon le fuseau horaire du navigateur.
function formaterDateLocale(date) {
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

/**
 * Liste de rendez-vous côté patient avec actions complètes : voir le
 * profil du médecin, écrire, modifier, annuler, et sélection multiple pour
 * supprimer l'historique terminé (annulé/refusé/terminé).
 */
export default function ListeRendezVousPatient({ rdvs, surRafraichissement }) {
  const { utilisateur } = useAuth()
  const nonLus = useEntitesNonLues(utilisateur.id, LIEN)
  const consulter = (id) => { if (nonLus.has(id)) marquerEntiteLue(utilisateur.id, LIEN, id) }
  const [rdvEnEdition, setRdvEnEdition] = useState(null)
  const [brouillon, setBrouillon] = useState({ date: '', heure: '', motif: '' })
  const [erreurEdition, setErreurEdition] = useState('')
  const [enregistrement, setEnregistrement] = useState(false)

  const [modeSelection, setModeSelection] = useState(false)
  const [selection, setSelection] = useState(new Set())
  const [suppression, setSuppression] = useState(false)

  const annuler = async (id) => {
    if (!confirm('Annuler ce rendez-vous ? Le professionnel sera notifié.')) return
    await supabase.from('rendez_vous').update({ statut: 'annule' }).eq('id', id)
    surRafraichissement?.()
  }

  const ouvrirEdition = (rdv) => {
    const d = new Date(rdv.date_heure)
    setRdvEnEdition(rdv)
    setErreurEdition('')
    setBrouillon({
      date: formaterDateLocale(d),
      heure: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      motif: rdv.motif || '',
    })
  }

  const enregistrerModification = async () => {
    setErreurEdition('')
    setEnregistrement(true)
    const nouvelleDateHeure = new Date(`${brouillon.date}T${brouillon.heure}:00`).toISOString()
    const etaitConfirme = rdvEnEdition.statut === 'confirme'

    const { error } = await supabase.from('rendez_vous').update({
      date_heure: nouvelleDateHeure,
      motif: brouillon.motif,
      statut: 'en_attente',
      // Si c'était déjà confirmé, le professionnel doit explicitement le
      // revalider — on distingue ce cas d'une simple nouvelle demande.
      necessite_reconfirmation: etaitConfirme,
    }).eq('id', rdvEnEdition.id)

    setEnregistrement(false)

    if (error) {
      setErreurEdition(
        error.code === '23505'
          ? 'Ce créneau est déjà pris par un autre rendez-vous confirmé. Choisissez un autre horaire.'
          : error.message
      )
      return
    }

    setRdvEnEdition(null)
    surRafraichissement?.()
  }

  const basculerSelection = (id) => {
    setSelection(prev => {
      const copie = new Set(prev)
      copie.has(id) ? copie.delete(id) : copie.add(id)
      return copie
    })
  }

  const annulerSelection = () => {
    setModeSelection(false)
    setSelection(new Set())
  }

  const supprimerSelection = async () => {
    if (selection.size === 0) return
    if (!confirm(`Supprimer définitivement ${selection.size} rendez-vous de votre historique ?`)) return
    setSuppression(true)
    await supabase.from('rendez_vous').delete().in('id', [...selection])
    setSuppression(false)
    setSelection(new Set())
    setModeSelection(false)
    surRafraichissement?.()
  }

  const nombreSupprimables = rdvs.filter(r => STATUTS_TERMINES.includes(r.statut)).length

  return (
    <>
      {nombreSupprimables > 0 && (
        <div className="flex items-center justify-end gap-2 mb-3">
          {modeSelection ? (
            <>
              <span className="text-sm text-ardoise">{selection.size} sélectionné(s)</span>
              <button onClick={supprimerSelection} disabled={selection.size === 0 || suppression} className="btn-fantome !py-1.5 !px-3 text-sm text-alerte">
                {suppression ? 'Suppression…' : 'Supprimer la sélection'}
              </button>
              <button onClick={annulerSelection} className="btn-fantome !py-1.5 !px-3 text-sm">Annuler</button>
            </>
          ) : (
            <button onClick={() => setModeSelection(true)} className="btn-fantome !py-1.5 !px-3 text-sm">
              Sélectionner pour supprimer
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {rdvs.map(rdv => {
          const modifiable = ['en_attente', 'confirme'].includes(rdv.statut) && new Date(rdv.date_heure) > new Date()
          const supprimable = STATUTS_TERMINES.includes(rdv.statut)
          return (
            <CarteRendezVous
              key={rdv.id}
              rdv={rdv}
              nonLu={nonLus.has(rdv.id)} onConsulter={() => consulter(rdv.id)}
              nomAffiche={`Dr ${rdv.professionnels?.prenom} ${rdv.professionnels?.nom}`}
              lienProfil={`/professionnel/${rdv.professionnel_id}`}
              checkbox={modeSelection && supprimable ? (
                <input type="checkbox" className="w-4 h-4" checked={selection.has(rdv.id)} onChange={() => basculerSelection(rdv.id)} />
              ) : null}
              actions={(
                <>
                  <Link to="/patient/messagerie" className="btn-fantome !py-2 !px-3 text-sm">Écrire au médecin</Link>
                  {modifiable && (
                    <button onClick={() => ouvrirEdition(rdv)} className="btn-fantome !py-2 !px-3 text-sm">Modifier</button>
                  )}
                  {modifiable && (
                    <button onClick={() => annuler(rdv.id)} className="btn-fantome !py-2 !px-3 text-sm">Annuler</button>
                  )}
                </>
              )}
            />
          )
        })}
      </div>

      {rdvEnEdition && (
        <div className="fixed inset-0 bg-charbon/40 flex items-center justify-center p-4 z-50">
          <div className="carte p-6 max-w-md w-full">
            <h2 className="font-display font-semibold text-lg mb-1">Modifier le rendez-vous</h2>
            <p className="text-sm text-ardoise mb-4">
              avec Dr {rdvEnEdition.professionnels?.prenom} {rdvEnEdition.professionnels?.nom}.
              {rdvEnEdition.statut === 'confirme'
                ? ' Ce rendez-vous était confirmé : le professionnel devra le reconfirmer après votre modification.'
                : ' La modification repasse le rendez-vous en attente de confirmation.'}
            </p>
            {erreurEdition && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2 mb-3">{erreurEdition}</p>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="etiquette">Date</label>
                  <input type="date" className="champ" min={formaterDateLocale(new Date())}
                    value={brouillon.date} onChange={e => setBrouillon(b => ({ ...b, date: e.target.value }))} />
                </div>
                <div>
                  <label className="etiquette">Heure</label>
                  <input type="time" className="champ"
                    value={brouillon.heure} onChange={e => setBrouillon(b => ({ ...b, heure: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="etiquette">Motif</label>
                <textarea rows={2} className="champ" value={brouillon.motif} onChange={e => setBrouillon(b => ({ ...b, motif: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={enregistrerModification} disabled={enregistrement} className="btn-primaire flex-1">
                {enregistrement ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
              <button onClick={() => setRdvEnEdition(null)} className="btn-fantome">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
