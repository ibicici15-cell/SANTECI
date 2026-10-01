import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { libelleSpecialite, formaterFCFA, MOYENS_PAIEMENT } from '../lib/constantes'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'

export default function FicheProfessionnel() {
  const { id } = useParams()
  const { role } = useAuth()
  const [pro, setPro] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    (async () => {
      setChargement(true)
      const { data } = await supabase.from('professionnels').select('*').eq('id', id).maybeSingle()
      setPro(data)
      setChargement(false)
    })()
  }, [id])

  if (chargement) return <Loader />
  if (!pro) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ardoise">Professionnel introuvable.</div>

  const moyens = MOYENS_PAIEMENT.filter(m => pro.moyens_paiement?.includes(m.valeur))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <div className="flex gap-5 items-start">
          <div className="w-24 h-24 rounded-xl2 bg-foret-light flex items-center justify-center overflow-hidden shrink-0">
            {pro.photo_url ? <img src={pro.photo_url} alt="" className="w-full h-full object-cover" /> : (
              <span className="font-display font-bold text-foret text-2xl">{pro.prenom?.[0]}{pro.nom?.[0]}</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-charbon">Dr {pro.prenom} {pro.nom}</h1>
            <p className="text-ardoise">{libelleSpecialite(pro.specialite)}</p>
            <p className="text-ardoise text-sm mt-1">{pro.ville} · {pro.experience_annees || 0} ans d'expérience</p>
          </div>
        </div>

        {pro.biographie && (
          <div className="mt-6">
            <h2 className="font-display font-semibold text-lg">À propos</h2>
            <p className="text-ardoise mt-2 whitespace-pre-line">{pro.biographie}</p>
          </div>
        )}

        <div className="mt-6">
          <h2 className="font-display font-semibold text-lg">Langues parlées</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {(pro.langues_parlees || []).map(l => (
              <span key={l} className="text-sm px-3 py-1 rounded-full bg-charbon/5">{l}</span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-display font-semibold text-lg">Moyens de paiement acceptés</h2>
          <p className="text-xs text-ardoise mt-1">
            Le règlement de la consultation se fait directement avec le professionnel (avant ou après
            la consultation, selon son organisation) — la plateforme n'intervient pas dans cette transaction.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {moyens.length ? moyens.map(m => (
              <span key={m.valeur} className="text-sm px-3 py-1 rounded-full bg-charbon/5">{m.libelle}</span>
            )) : <p className="text-ardoise text-sm">Non renseigné — à convenir directement avec le professionnel.</p>}
          </div>
        </div>
      </div>

      <aside className="carte p-5 h-fit sticky top-24">
        <p className="text-sm text-ardoise">Tarif de consultation</p>
        <p className="font-donnee text-2xl font-semibold text-charbon">{formaterFCFA(pro.tarif_consultation)}</p>

        <div className="flex flex-wrap gap-2 mt-3">
          {pro.modes_consultation?.includes('cabinet') && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-foret-light text-foret-dark font-medium">Cabinet</span>
          )}
          {pro.modes_consultation?.includes('teleconsultation') && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-ambre-light text-ambre-dark font-medium">Téléconsultation</span>
          )}
        </div>

        {!pro.valide_par_admin ? (
          <p className="text-sm text-ocre bg-ocre/10 rounded-lg px-3 py-2 mt-5">
            Ce professionnel est en attente de validation. La prise de rendez-vous sera
            disponible dès que son compte sera vérifié.
          </p>
        ) : role === 'patient' ? (
          <Link to={`/rendez-vous/prendre/${pro.id}`} className="btn-primaire w-full mt-5">Prendre rendez-vous</Link>
        ) : (
          <Link to="/connexion" className="btn-primaire w-full mt-5">Se connecter pour réserver</Link>
        )}
        {pro.adresse_cabinet && <p className="text-xs text-ardoise mt-3">{pro.adresse_cabinet}</p>}
      </aside>
    </div>
  )
}
