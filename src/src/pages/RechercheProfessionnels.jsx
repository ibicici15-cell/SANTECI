import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { SPECIALITES_LISTE, VILLES_CI } from '../lib/constantes'
import CarteProfessionnel from '../components/CarteProfessionnel'
import Loader from '../components/Loader'
import SelectAvecAutre from '../components/SelectAvecAutre'

export default function RechercheProfessionnels() {
  const [params, setParams] = useSearchParams()
  const [pros, setPros] = useState([])
  const [chargement, setChargement] = useState(true)

  const specialite = params.get('specialite') || ''
  const ville = params.get('ville') || ''
  const mode = params.get('mode') || ''

  const rechercher = useCallback(async () => {
    setChargement(true)
    let requete = supabase
      .from('professionnels')
      .select('*')
      .eq('actif', true)
      .eq('valide_par_admin', true)

    if (specialite) requete = requete.ilike('specialite', specialite.trim())
    if (ville) requete = requete.ilike('ville', ville.trim())
    if (mode) requete = requete.contains('modes_consultation', [mode])

    const { data, error } = await requete.order('note_moyenne', { ascending: false })
    if (!error) setPros(data || [])
    setChargement(false)
  }, [specialite, ville, mode])

  useEffect(() => { rechercher() }, [rechercher])

  const majFiltre = (cle, valeur) => {
    const p = new URLSearchParams(params)
    valeur ? p.set(cle, valeur) : p.delete(cle)
    setParams(p)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-charbon">Trouver un professionnel de santé</h1>
      <p className="text-ardoise mt-1">Filtrez par spécialité, ville ou mode de consultation.</p>

      <div className="carte p-4 mt-6 flex flex-col sm:flex-row gap-3">
        <div><SelectAvecAutre optionVide="Toutes les spécialités" options={SPECIALITES_LISTE} value={specialite}
          onChange={v => majFiltre('specialite', v)} placeholderAutre="Précisez la spécialité" /></div>
        <div><SelectAvecAutre optionVide="Toutes les villes" options={VILLES_CI} value={ville}
          onChange={v => majFiltre('ville', v)} placeholderAutre="Précisez la ville" /></div>
        <select className="champ" value={mode} onChange={e => majFiltre('mode', e.target.value)}>
          <option value="">Tous les modes</option>
          <option value="cabinet">Consultation au cabinet</option>
          <option value="teleconsultation">Téléconsultation</option>
        </select>
      </div>

      <div className="mt-8">
        {chargement ? (
          <Loader label="Recherche des professionnels…" />
        ) : pros.length === 0 ? (
          <div className="carte p-10 text-center">
            <p className="font-display font-semibold text-lg">Aucun professionnel trouvé</p>
            <p className="text-ardoise text-sm mt-1">Essayez d'élargir vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pros.map(pro => <CarteProfessionnel key={pro.id} pro={pro} />)}
          </div>
        )}
      </div>
    </div>
  )
}
