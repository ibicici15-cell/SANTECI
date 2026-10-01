import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { SPECIALITES_LISTE, VILLES_CI, NIVEAUX_URGENCE, libelleSpecialite } from '../lib/constantes'
import Loader from '../components/Loader'
import SelectAvecAutre from '../components/SelectAvecAutre'

export default function TrouverExpertise() {
  const { utilisateur } = useAuth()
  const [specialite, setSpecialite] = useState('')
  const [ville, setVille] = useState('')
  const [resultats, setResultats] = useState([])
  const [chargement, setChargement] = useState(true)
  const [selection, setSelection] = useState(new Set())

  const [description, setDescription] = useState('')
  const [urgence, setUrgence] = useState('normal')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)

  // Affiche tous les confrères éligibles par défaut ; la spécialité et la
  // ville ne sont que des filtres facultatifs, pas des conditions bloquantes.
  const rechercher = useCallback(async () => {
    setChargement(true)
    let requete = supabase
      .from('professionnels')
      .select('*')
      .eq('valide_par_admin', true)
      .eq('accepte_collaborations', true)
      .neq('id', utilisateur.id)
    if (specialite) requete = requete.ilike('specialite', specialite.trim())
    if (ville) requete = requete.ilike('ville', ville.trim())
    const { data } = await requete.order('nom')
    setResultats(data || [])
    setSelection(new Set())
    setChargement(false)
  }, [utilisateur.id, specialite, ville])

  useEffect(() => { rechercher() }, [rechercher])

  const basculerSelection = (id) => {
    setSelection(prev => {
      const copie = new Set(prev)
      copie.has(id) ? copie.delete(id) : copie.add(id)
      return copie
    })
  }

  const envoyer = async (e) => {
    e.preventDefault()
    setErreur('')
    if (selection.size === 0) { setErreur('Sélectionnez au moins un confrère à contacter.'); return }
    if (!description.trim()) { setErreur('Décrivez votre besoin.'); return }

    setEnvoi(true)
    const { data: demande, error } = await supabase.from('demandes_collaboration').insert({
      demandeur_id: utilisateur.id,
      specialite_recherchee: specialite || null,
      ville_recherchee: ville || null,
      description,
      urgence,
    }).select().single()

    if (error) { setEnvoi(false); setErreur(error.message); return }

    const { error: erreurDest } = await supabase.from('destinataires_collaboration').insert(
      [...selection].map(professionnel_id => ({ demande_id: demande.id, professionnel_id }))
    )
    setEnvoi(false)
    if (erreurDest) { setErreur(erreurDest.message); return }
    setSucces(true)
  }

  if (succes) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="font-display font-semibold text-lg text-foret">Demande envoyée à {selection.size} confrère(s) !</p>
        <p className="text-ardoise text-sm mt-2">
          Vous serez notifié dès qu'un confrère répond. Suivez l'avancement dans "Mes collaborations".
        </p>
        <Link to="/professionnel/collaborations" className="btn-primaire mt-6 inline-flex">Voir mes collaborations</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Trouver une expertise</h1>
      <p className="text-ardoise text-sm mt-1">
        Tous les confrères ouverts à la collaboration sont listés ci-dessous — affinez avec les
        filtres si besoin. Ce n'est pas une prise de rendez-vous, juste une mise en relation
        entre professionnels.
      </p>

      <div className="carte p-4 mt-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SelectAvecAutre optionVide="Toutes les spécialités" options={SPECIALITES_LISTE} value={specialite}
          onChange={setSpecialite} placeholderAutre="Précisez la spécialité" /></div>
        <div className="flex-1"><SelectAvecAutre optionVide="Toutes les villes" options={VILLES_CI} value={ville}
          onChange={setVille} placeholderAutre="Précisez la ville" /></div>
      </div>

      {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2 mt-4">{erreur}</p>}

      {chargement ? <Loader /> : resultats.length === 0 ? (
        <div className="carte p-10 text-center mt-6">
          <p className="font-display font-semibold text-lg">Aucun confrère disponible</p>
          <p className="text-ardoise text-sm mt-1">
            Essayez d'élargir vos filtres. Seuls les professionnels validés ayant activé
            "Accepter les collaborations" dans leur profil apparaissent ici.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ardoise mt-6 mb-2">Sélectionnez un ou plusieurs confrères à contacter :</p>
          <div className="space-y-2">
            {resultats.map(pro => (
              <label key={pro.id} className={`carte p-4 flex items-center gap-3 cursor-pointer ${selection.has(pro.id) ? 'border-foret ring-1 ring-foret' : ''}`}>
                <input type="checkbox" className="w-4 h-4" checked={selection.has(pro.id)} onChange={() => basculerSelection(pro.id)} />
                <div>
                  <p className="font-medium">Dr {pro.prenom} {pro.nom}</p>
                  <p className="text-sm text-ardoise">{libelleSpecialite(pro.specialite)} · {pro.ville}</p>
                </div>
              </label>
            ))}
          </div>

          <form onSubmit={envoyer} className="carte p-6 mt-6 space-y-4">
            <div>
              <label className="etiquette">Décrivez votre besoin</label>
              <textarea rows={4} className="champ" placeholder="Ex : patient de 45 ans, suspicion de..., besoin d'un avis chirurgical."
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="etiquette">Niveau d'urgence</label>
              <div className="flex gap-2">
                {NIVEAUX_URGENCE.map(u => (
                  <button type="button" key={u.valeur} onClick={() => setUrgence(u.valeur)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${urgence === u.valeur ? 'border-foret bg-foret-light text-foret-dark' : 'border-ligne text-ardoise'}`}>
                    {u.libelle}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-ardoise">
              Par confidentialité, aucun dossier patient n'est partagé automatiquement — décrivez
              uniquement ce qui est nécessaire, et échangez les détails via la messagerie une fois
              la collaboration acceptée.
            </p>
            <button disabled={envoi || selection.size === 0} className="btn-primaire w-full">
              {envoi ? 'Envoi…' : `Envoyer à ${selection.size} confrère(s)`}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
