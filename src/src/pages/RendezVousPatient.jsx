import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import ListeRendezVousPatient from '../components/ListeRendezVousPatient'

export default function RendezVousPatient() {
  const { utilisateur } = useAuth()
  const [rdvs, setRdvs] = useState([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('rendez_vous')
      .select('*, professionnels(nom, prenom, specialite)')
      .eq('patient_id', utilisateur.id)
      .order('date_heure', { ascending: false })
    setRdvs(data || [])
    setChargement(false)
  }, [utilisateur.id])

  useEffect(() => { charger() }, [charger])

  if (chargement) return <Loader />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Mes rendez-vous</h1>

      {rdvs.length === 0 ? (
        <p className="text-ardoise mt-6">Aucun rendez-vous pour le moment.</p>
      ) : (
        <div className="mt-6">
          <ListeRendezVousPatient rdvs={rdvs} surRafraichissement={charger} />
        </div>
      )}
    </div>
  )
}
