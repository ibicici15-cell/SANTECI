import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import CarteRendezVous from '../components/CarteRendezVous'
import ModaleCompteRendu from '../components/ModaleCompteRendu'
import useEntitesNonLues from '../hooks/useEntitesNonLues'
import { marquerEntiteLue } from '../lib/notifications'

const STATUTS_TERMINES = ['annule', 'refuse', 'termine']
const LIEN = '/professionnel/rendez-vous'

export default function RendezVousProfessionnel() {
  const { utilisateur } = useAuth()
  const [rdvs, setRdvs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [rdvOuvert, setRdvOuvert] = useState(null)
  const nonLus = useEntitesNonLues(utilisateur.id, LIEN)
  const consulter = (id) => { if (nonLus.has(id)) marquerEntiteLue(utilisateur.id, LIEN, id) }

  const [modeSelection, setModeSelection] = useState(false)
  const [selection, setSelection] = useState(new Set())
  const [suppression, setSuppression] = useState(false)

  const charger = async () => {
    const { data } = await supabase
      .from('rendez_vous')
      .select('*, patients(nom, prenom)')
      .eq('professionnel_id', utilisateur.id)
      .order('date_heure', { ascending: false })
    setRdvs(data || [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [utilisateur.id])

  const basculerSelection = (id) => {
    setSelection(prev => {
      const copie = new Set(prev)
      copie.has(id) ? copie.delete(id) : copie.add(id)
      return copie
    })
  }

  const supprimerSelection = async () => {
    if (selection.size === 0) return
    if (!confirm(`Supprimer définitivement ${selection.size} rendez-vous de votre historique ?`)) return
    setSuppression(true)
    await supabase.from('rendez_vous').delete().in('id', [...selection])
    setSuppression(false)
    setSelection(new Set())
    setModeSelection(false)
    charger()
  }

  if (chargement) return <Loader />

  const nombreSupprimables = rdvs.filter(r => STATUTS_TERMINES.includes(r.statut)).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Mes rendez-vous</h1>

      {nombreSupprimables > 0 && (
        <div className="flex items-center justify-end gap-2 mt-6">
          {modeSelection ? (
            <>
              <span className="text-sm text-ardoise">{selection.size} sélectionné(s)</span>
              <button onClick={supprimerSelection} disabled={selection.size === 0 || suppression} className="btn-fantome !py-1.5 !px-3 text-sm text-alerte">
                {suppression ? 'Suppression…' : 'Supprimer la sélection'}
              </button>
              <button onClick={() => { setModeSelection(false); setSelection(new Set()) }} className="btn-fantome !py-1.5 !px-3 text-sm">Annuler</button>
            </>
          ) : (
            <button onClick={() => setModeSelection(true)} className="btn-fantome !py-1.5 !px-3 text-sm">
              Sélectionner pour supprimer
            </button>
          )}
        </div>
      )}

      <div className="space-y-3 mt-6">
        {rdvs.length === 0 && <p className="text-ardoise">Aucun rendez-vous pour le moment.</p>}
        {rdvs.map(rdv => (
          <CarteRendezVous
            key={rdv.id}
            rdv={rdv}
            nonLu={nonLus.has(rdv.id)} onConsulter={() => consulter(rdv.id)}
            nomAffiche={`${rdv.patients?.prenom} ${rdv.patients?.nom}`} lienProfil={`/professionnel/patient/${rdv.patient_id}`}
            checkbox={modeSelection && STATUTS_TERMINES.includes(rdv.statut) ? (
              <input type="checkbox" className="w-4 h-4" checked={selection.has(rdv.id)} onChange={() => basculerSelection(rdv.id)} />
            ) : null}
            actions={(
              <>
                <Link to="/professionnel/messagerie" className="btn-fantome !py-2 !px-3 text-sm">Écrire</Link>
                {rdv.statut === 'confirme' && (
                  <button onClick={() => setRdvOuvert(rdv)} className="btn-secondaire !py-2 !px-3 text-sm">Rédiger le compte-rendu</button>
                )}
              </>
            )}
          />
        ))}
      </div>

      {rdvOuvert && (
        <ModaleCompteRendu
          rdv={rdvOuvert}
          utilisateurId={utilisateur.id}
          onFerme={() => setRdvOuvert(null)}
          onTermine={() => { setRdvOuvert(null); charger() }}
        />
      )}
    </div>
  )
}
