import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formaterFCFA, libelleDelai, libelleModeRetrait, MOYENS_PAIEMENT } from '../lib/constantes'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function FicheLaboratoire() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const prestationPreselectionnee = params.get('prestation')
  const { role } = useAuth()
  const [labo, setLabo] = useState(null)
  const [prestations, setPrestations] = useState([])
  const [jours, setJours] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ data: laboData }, { data: prestData }, { data: joursData }] = await Promise.all([
        supabase.from('laboratoires').select('*').eq('id', id).maybeSingle(),
        supabase.from('prestations_labo').select('*').eq('labo_id', id).order('nom_analyse'),
        supabase.from('jours_ouverture_labo').select('*').eq('labo_id', id).order('jour_semaine'),
      ])
      setLabo(laboData)
      setPrestations(prestData || [])
      setJours(joursData || [])
      setChargement(false)
    })()
  }, [id])

  if (chargement) return <Loader />
  if (!labo) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ardoise">Laboratoire introuvable.</div>

  const moyens = MOYENS_PAIEMENT.filter(m => labo.moyens_paiement?.includes(m.valeur))
  const peutDemander = role === 'patient' || role === 'professionnel'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <div className="flex gap-5 items-start">
          <div className="w-24 h-24 rounded-xl2 bg-foret-light flex items-center justify-center overflow-hidden shrink-0">
            {labo.logo_url ? <img src={labo.logo_url} alt="" className="w-full h-full object-cover" /> : (
              <span className="font-display font-bold text-foret text-2xl">{labo.nom?.[0]}</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-charbon">{labo.nom}</h1>
            <p className="text-ardoise">{labo.ville}</p>
          </div>
        </div>

        {labo.description && (
          <div className="mt-6">
            <h2 className="font-display font-semibold text-lg">À propos</h2>
            <p className="text-ardoise mt-2 whitespace-pre-line">{labo.description}</p>
          </div>
        )}

        {!labo.valide_par_admin && (
          <p className="text-sm text-ocre bg-ocre/10 rounded-lg px-3 py-2 mt-6">
            Ce laboratoire est en attente de validation.
          </p>
        )}

        <div className="mt-6">
          <h2 className="font-display font-semibold text-lg">Catalogue d'analyses</h2>
          {prestations.length === 0 ? (
            <p className="text-ardoise text-sm mt-2">
              Aucun catalogue détaillé — contactez directement le laboratoire pour un devis personnalisé.
            </p>
          ) : (
            <div className="space-y-2 mt-3">
              {prestations.map(p => (
                <div key={p.id} className={`carte p-4 flex items-center justify-between gap-3 ${prestationPreselectionnee === p.id ? 'border-foret ring-1 ring-foret' : ''}`}>
                  <div>
                    <p className="font-medium">{p.nom_analyse}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-foret-light text-foret-dark">{libelleDelai(p.delai_heures)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-charbon/5">{libelleModeRetrait(p.mode_retrait)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-donnee font-semibold">{formaterFCFA(p.prix)}</p>
                    {peutDemander && (
                      <Link to={`/laboratoire/demander/${labo.id}?prestation=${p.id}`} className="text-foret text-sm font-semibold">Demander →</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {jours.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display font-semibold text-lg">Jours d'ouverture</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {jours.map(j => (
                <span key={j.id} className="text-sm px-3 py-1 rounded-full bg-charbon/5">
                  {JOURS[j.jour_semaine]} {j.heure_debut?.slice(0, 5)}-{j.heure_fin?.slice(0, 5)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="carte p-5 h-fit sticky top-24">
        <p className="text-sm text-ardoise">Moyens de paiement</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {moyens.length ? moyens.map(m => (
            <span key={m.valeur} className="text-xs px-2.5 py-1 rounded-full bg-charbon/5">{m.libelle}</span>
          )) : <p className="text-ardoise text-sm">À convenir directement.</p>}
        </div>

        {labo.valide_par_admin && peutDemander ? (
          <Link to={`/laboratoire/demander/${labo.id}`} className="btn-primaire w-full mt-5">
            Demander un devis / une analyse
          </Link>
        ) : !peutDemander && (
          <Link to="/connexion" className="btn-primaire w-full mt-5">Se connecter pour demander</Link>
        )}
        {labo.adresse && <p className="text-xs text-ardoise mt-3">{labo.adresse}</p>}
      </aside>
    </div>
  )
}
