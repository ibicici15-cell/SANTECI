import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import CarteStat from '../components/CarteStat'
import Badge from '../components/Badge'
import { libelleSpecialite } from '../lib/constantes'

export default function TableauDeBordEtablissement() {
  const { utilisateur, detail } = useAuth()
  const [professionnels, setProfessionnels] = useState([])
  const [rdvCount, setRdvCount] = useState(0)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: pros } = await supabase.from('professionnels').select('*, abonnements(statut)').eq('etablissement_id', utilisateur.id)
      setProfessionnels(pros || [])
      if (pros?.length) {
        const { count } = await supabase
          .from('rendez_vous')
          .select('*', { count: 'exact', head: true })
          .in('professionnel_id', pros.map(p => p.id))
        setRdvCount(count || 0)
      }
      setChargement(false)
    })()
  }, [utilisateur.id])

  if (chargement) return <Loader />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">{detail?.nom}</h1>
      <p className="text-ardoise mt-1">Tableau de bord établissement</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <CarteStat label="Professionnels" valeur={professionnels.length} accent="foret" />
        <CarteStat label="Rendez-vous cumulés" valeur={rdvCount} accent="ambre" />
        <CarteStat label="Abonnements actifs" valeur={professionnels.filter(p => p.abonnements?.[0]?.statut === 'actif').length} accent="ocre" />
      </div>

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">Mes praticiens</h2>
      <div className="space-y-2">
        {professionnels.length === 0 && (
          <p className="text-ardoise text-sm">
            Aucun professionnel rattaché pour le moment. Invitez vos praticiens à créer un compte
            en renseignant le nom de votre établissement lors de leur inscription.
          </p>
        )}
        {professionnels.map(p => (
          <div key={p.id} className="carte p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Dr {p.prenom} {p.nom}</p>
              <p className="text-sm text-ardoise">{libelleSpecialite(p.specialite)}</p>
            </div>
            <Badge statut={p.abonnements?.[0]?.statut || 'essai'} />
          </div>
        ))}
      </div>
    </div>
  )
}
