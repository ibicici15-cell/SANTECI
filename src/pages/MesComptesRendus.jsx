import { useEffect, useState } from 'react'
import { ClipboardList, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { urlSignee } from '../lib/stockage'
import Loader from '../components/Loader'
import PointNonLu from '../components/PointNonLu'
import useEntitesNonLues from '../hooks/useEntitesNonLues'
import { marquerEntiteLue } from '../lib/notifications'

const LIEN = '/patient/comptes-rendus'

export default function MesComptesRendus() {
  const { utilisateur } = useAuth()
  const [consultations, setConsultations] = useState([])
  const [chargement, setChargement] = useState(true)
  const [selection, setSelection] = useState(new Set())
  const [suppression, setSuppression] = useState(false)
  const nonLus = useEntitesNonLues(utilisateur.id, LIEN)

  const charger = async () => {
    setChargement(true)
    const { data } = await supabase
      .from('consultations')
      .select('*, rendez_vous!inner(patient_id, date_heure, professionnels(nom, prenom, specialite)), ordonnances(*)')
      .eq('rendez_vous.patient_id', utilisateur.id)
      .order('created_at', { ascending: false })

    const avecUrls = await Promise.all((data || []).map(async c => ({
      ...c,
      ordonnances: await Promise.all((c.ordonnances || []).map(async o => ({
        ...o, urlSignee: o.fichier_url ? await urlSignee('ordonnances', o.fichier_url) : null,
      }))),
    })))
    setConsultations(avecUrls)
    setSelection(new Set())
    setChargement(false)
  }

  useEffect(() => { charger() }, [utilisateur.id])

  const consulter = (id) => {
    if (nonLus.has(id)) marquerEntiteLue(utilisateur.id, LIEN, id)
  }

  const basculer = (id) => {
    setSelection(s => {
      const copie = new Set(s)
      copie.has(id) ? copie.delete(id) : copie.add(id)
      return copie
    })
  }

  const supprimerSelection = async () => {
    if (selection.size === 0) return
    if (!confirm(`Supprimer ${selection.size} compte-rendu${selection.size > 1 ? 's' : ''} ? Cette action est définitive (l'ordonnance associée sera aussi supprimée).`)) return
    setSuppression(true)
    await supabase.from('consultations').delete().in('id', Array.from(selection))
    setSuppression(false)
    await charger()
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="font-display font-bold text-2xl flex items-center gap-2"><ClipboardList size={24} /> Mes comptes-rendus</h1>
      <p className="text-ardoise text-sm mt-1">Comptes-rendus de vos consultations et ordonnances associées.</p>

      {selection.size > 0 && (
        <div className="carte p-3 mt-4 flex items-center justify-between bg-alerte/5 border-alerte/20">
          <p className="text-sm">{selection.size} sélectionné{selection.size > 1 ? 's' : ''}</p>
          <button onClick={supprimerSelection} disabled={suppression} className="btn-secondaire !py-1.5 !px-3 text-sm flex items-center gap-1.5">
            <Trash2 size={14} /> {suppression ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      )}

      <div className="space-y-2 mt-4">
        {consultations.length === 0 && <p className="text-ardoise text-sm">Aucun compte-rendu pour le moment.</p>}
        {consultations.map(c => (
          <div key={c.id} onClick={() => consulter(c.id)}
            className={`carte p-4 flex gap-3 ${selection.has(c.id) ? 'ring-2 ring-foret' : ''}`}>
            <input type="checkbox" className="mt-1 shrink-0" checked={selection.has(c.id)}
              onClick={e => e.stopPropagation()} onChange={() => basculer(c.id)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-medium flex items-center gap-2">
                  <PointNonLu actif={nonLus.has(c.id)} />
                  Dr {c.rendez_vous?.professionnels?.prenom} {c.rendez_vous?.professionnels?.nom}
                </p>
                <p className="text-xs text-ardoise">
                  {c.rendez_vous?.date_heure ? new Date(c.rendez_vous.date_heure).toLocaleDateString('fr-FR') : ''}
                </p>
              </div>
              {c.observations && <p className="text-sm text-charbon mt-2"><span className="font-medium">Observations : </span>{c.observations}</p>}
              {c.diagnostic && <p className="text-sm text-charbon mt-2"><span className="font-medium">Diagnostic : </span>{c.diagnostic}</p>}
              {c.recommandations && <p className="text-sm text-charbon mt-2"><span className="font-medium">Recommandations : </span>{c.recommandations}</p>}

              {c.ordonnances?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-ligne space-y-2">
                  {c.ordonnances.map(o => (
                    <div key={o.id}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-xs font-semibold text-foret uppercase tracking-wide">Ordonnance</p>
                        {o.urlSignee && (
                          <a href={o.urlSignee} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            className="text-foret text-sm font-semibold shrink-0">Ouvrir le fichier joint →</a>
                        )}
                      </div>
                      <p className="text-sm text-charbon mt-1 whitespace-pre-line">{o.contenu}</p>
                      {o.examens_prescrits?.length > 0 && (
                        <p className="text-sm text-ardoise mt-1">Examens prescrits : {o.examens_prescrits.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
