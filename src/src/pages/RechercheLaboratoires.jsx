import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { VILLES_CI, formaterFCFA, libelleDelai, libelleModeRetrait, TYPES_ANALYSE_COURANTS } from '../lib/constantes'
import Loader from '../components/Loader'
import SelectAvecAutre from '../components/SelectAvecAutre'

export default function RechercheLaboratoires() {
  const [ville, setVille] = useState('')
  const [typeAnalyse, setTypeAnalyse] = useState('')
  const [delaiMax, setDelaiMax] = useState('')
  const [resultatsPrestations, setResultatsPrestations] = useState(null) // null = mode annuaire, array = mode filtré
  const [labos, setLabos] = useState([])
  const [chargement, setChargement] = useState(true)

  const rechercher = useCallback(async () => {
    setChargement(true)
    if (typeAnalyse.trim()) {
      let requete = supabase
        .from('prestations_labo')
        .select('*, laboratoires!inner(*)')
        .ilike('nom_analyse', `%${typeAnalyse.trim()}%`)
        .eq('laboratoires.valide_par_admin', true)
        .eq('laboratoires.actif', true)
      if (ville) requete = requete.eq('laboratoires.ville', ville)
      if (delaiMax) requete = requete.lte('delai_heures', Number(delaiMax))
      const { data } = await requete
      setResultatsPrestations(data || [])
      setLabos([])
    } else {
      let requete = supabase.from('laboratoires').select('*').eq('valide_par_admin', true).eq('actif', true)
      if (ville) requete = requete.ilike('ville', ville.trim())
      const { data } = await requete
      setLabos(data || [])
      setResultatsPrestations(null)
    }
    setChargement(false)
  }, [ville, typeAnalyse, delaiMax])

  useEffect(() => { rechercher() }, [rechercher])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-charbon flex items-center gap-2">
        <FlaskConical className="text-foret" /> Trouver un laboratoire
      </h1>
      <p className="text-ardoise mt-1">Filtrez par type d'analyse pour voir directement les tarifs et délais.</p>

      <div className="carte p-4 mt-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SelectAvecAutre optionVide="Tous types d'analyse" options={TYPES_ANALYSE_COURANTS} value={typeAnalyse}
          onChange={setTypeAnalyse} placeholderAutre="Précisez le type d'analyse" /></div>
        <div className="sm:w-44"><SelectAvecAutre optionVide="Toutes les villes" options={VILLES_CI} value={ville}
          onChange={setVille} placeholderAutre="Précisez la ville" /></div>
        {typeAnalyse.trim() && (
          <input type="number" min="0" className="champ sm:w-44" placeholder="Délai max (h)" value={delaiMax} onChange={e => setDelaiMax(e.target.value)} />
        )}
      </div>

      <div className="mt-8">
        {chargement ? <Loader label="Recherche…" /> : resultatsPrestations !== null ? (
          resultatsPrestations.length === 0 ? (
            <div className="carte p-10 text-center">
              <p className="font-display font-semibold text-lg">Aucune prestation ne correspond</p>
              <p className="text-ardoise text-sm mt-1">Essayez sans filtre de délai, ou parcourez l'annuaire complet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {resultatsPrestations.map(p => (
                <Link key={p.id} to={`/laboratoire/${p.labo_id}?prestation=${p.id}`} className="carte p-5">
                  <p className="font-display font-semibold">{p.laboratoires.nom}</p>
                  <p className="text-sm text-ardoise">{p.laboratoires.ville}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm">{p.nom_analyse}</p>
                    <p className="font-donnee font-semibold">{formaterFCFA(p.prix)}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-foret-light text-foret-dark">{libelleDelai(p.delai_heures)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-charbon/5">{libelleModeRetrait(p.mode_retrait)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : labos.length === 0 ? (
          <div className="carte p-10 text-center">
            <p className="font-display font-semibold text-lg">Aucun laboratoire trouvé</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {labos.map(labo => (
              <Link key={labo.id} to={`/laboratoire/${labo.id}`} className="carte p-5 flex gap-4">
                <div className="w-14 h-14 rounded-xl2 bg-foret-light flex items-center justify-center overflow-hidden shrink-0">
                  {labo.logo_url ? <img src={labo.logo_url} alt="" className="w-full h-full object-cover" /> : (
                    <span className="font-display font-bold text-foret">{labo.nom?.[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold truncate">{labo.nom}</p>
                  <p className="text-sm text-ardoise truncate">{labo.ville}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
