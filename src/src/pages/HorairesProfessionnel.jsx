import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const JOURS_OUVRABLES = [1, 2, 3, 4, 5, 6, 0] // affiche Lundi → Dimanche
const PREMIERE_HEURE = 7
const DERNIERE_HEURE = 20 // exclusif (dernier créneau affiché = 19h-20h)

function creerCleJourHeure(jour, heure) { return `${jour}-${heure}` }
function libellePlage(heure) { return `${String(heure).padStart(2, '0')}h-${String(heure + 1).padStart(2, '0')}h` }

/** Fusionne une liste d'heures triées en intervalles contigus [{debut, fin}] */
function fusionnerEnIntervalles(heures) {
  const trie = [...heures].sort((a, b) => a - b)
  const intervalles = []
  for (const h of trie) {
    const dernier = intervalles[intervalles.length - 1]
    if (dernier && dernier.fin === h) {
      dernier.fin = h + 1
    } else {
      intervalles.push({ debut: h, fin: h + 1 })
    }
  }
  return intervalles
}

export default function HorairesProfessionnel() {
  const { utilisateur } = useAuth()
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageOk, setMessageOk] = useState(false)
  const [modeEdition, setModeEdition] = useState(false)
  const [selection, setSelection] = useState(new Set())

  const heures = useMemo(() => {
    const liste = []
    for (let h = PREMIERE_HEURE; h < DERNIERE_HEURE; h++) liste.push(h)
    return liste
  }, [])

  const chargerDepuisLaBase = async () => {
    const { data } = await supabase
      .from('horaires_disponibilite')
      .select('*')
      .eq('professionnel_id', utilisateur.id)

    const ensemble = new Set()
    for (const ligne of data || []) {
      const debut = parseInt(ligne.heure_debut.slice(0, 2), 10)
      const fin = parseInt(ligne.heure_fin.slice(0, 2), 10)
      for (let h = debut; h < fin; h++) ensemble.add(creerCleJourHeure(ligne.jour_semaine, h))
    }
    setSelection(ensemble)
  }

  useEffect(() => {
    chargerDepuisLaBase().finally(() => setChargement(false))
  }, [utilisateur.id])

  const basculerCase = (jour, heure) => {
    if (!modeEdition) return
    setSelection(prev => {
      const copie = new Set(prev)
      const cle = creerCleJourHeure(jour, heure)
      copie.has(cle) ? copie.delete(cle) : copie.add(cle)
      return copie
    })
  }

  const basculerJournee = (jour) => {
    if (!modeEdition) return
    const clesJour = heures.map(h => creerCleJourHeure(jour, h))
    const toutSelectionne = clesJour.every(c => selection.has(c))
    setSelection(prev => {
      const copie = new Set(prev)
      clesJour.forEach(c => toutSelectionne ? copie.delete(c) : copie.add(c))
      return copie
    })
  }

  const toutSelectionnerOuVider = () => {
    if (!modeEdition) return
    const toutesLesCles = JOURS_OUVRABLES.flatMap(j => heures.map(h => creerCleJourHeure(j, h)))
    const toutEstSelectionne = toutesLesCles.every(c => selection.has(c))
    setSelection(toutEstSelectionne ? new Set() : new Set(toutesLesCles))
  }

  const soumettre = async () => {
    // Premier clic (mode vue) : on passe en mode édition, rien d'autre.
    if (!modeEdition) {
      setModeEdition(true)
      setMessageOk(false)
      return
    }

    // Deuxième clic (mode édition) : on enregistre réellement.
    setEnregistrement(true)

    const lignesAInserer = []
    for (const jour of JOURS_OUVRABLES) {
      const heuresJour = heures.filter(h => selection.has(creerCleJourHeure(jour, h)))
      for (const intervalle of fusionnerEnIntervalles(heuresJour)) {
        lignesAInserer.push({
          professionnel_id: utilisateur.id,
          jour_semaine: jour,
          heure_debut: `${String(intervalle.debut).padStart(2, '0')}:00`,
          heure_fin: `${String(intervalle.fin).padStart(2, '0')}:00`,
        })
      }
    }

    await supabase.from('horaires_disponibilite').delete().eq('professionnel_id', utilisateur.id)
    if (lignesAInserer.length > 0) {
      await supabase.from('horaires_disponibilite').insert(lignesAInserer)
    }

    setEnregistrement(false)
    setModeEdition(false)
    setMessageOk(true)
    setTimeout(() => setMessageOk(false), 4000)
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charbon">Mes disponibilités</h1>
          <p className="text-ardoise text-sm mt-1">
            {modeEdition
              ? "Cliquez sur les plages d'une heure où vous êtes disponible. Cliquez sur un jour pour tout sélectionner/désélectionner d'un coup."
              : 'Voici vos disponibilités actuelles (en vert). Cliquez sur « Modifier » pour les changer.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {modeEdition && (
            <button onClick={toutSelectionnerOuVider} className="btn-fantome !py-2 !px-4 text-sm">
              Tout sélectionner / vider
            </button>
          )}
          <button onClick={soumettre} disabled={enregistrement} className="btn-primaire !py-2 !px-4 text-sm">
            {modeEdition ? (enregistrement ? 'Enregistrement…' : 'Enregistrer mes disponibilités') : 'Modifier mes disponibilités'}
          </button>
        </div>
      </div>

      {messageOk && (
        <p className="text-sm text-foret bg-foret-light rounded-lg px-3 py-2 mt-4">
          ✓ Vos disponibilités ont bien été enregistrées.
        </p>
      )}

      <div className="carte p-4 mt-6 overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-20"></th>
              {JOURS_OUVRABLES.map(jour => (
                <th key={jour} className="pb-2">
                  <button
                    onClick={() => basculerJournee(jour)}
                    disabled={!modeEdition}
                    className={`text-xs font-semibold uppercase tracking-wide ${modeEdition ? 'text-ardoise hover:text-foret cursor-pointer' : 'text-ardoise cursor-default'}`}
                  >
                    {JOURS[jour].slice(0, 3)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heures.map(heure => (
              <tr key={heure}>
                <td className="text-xs text-ardoise font-donnee pr-2 py-0.5 text-right whitespace-nowrap">
                  {libellePlage(heure)}
                </td>
                {JOURS_OUVRABLES.map(jour => {
                  const selectionne = selection.has(creerCleJourHeure(jour, heure))
                  return (
                    <td key={jour} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => basculerCase(jour, heure)}
                        disabled={!modeEdition}
                        className={`w-full h-7 rounded-md border transition-colors ${
                          selectionne
                            ? 'bg-foret border-foret hover:bg-foret-dark'
                            : 'bg-white border-ligne hover:border-foret/40'
                        } ${!modeEdition ? 'cursor-default' : 'cursor-pointer'}`}
                        aria-label={`${JOURS[jour]} ${libellePlage(heure)}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
