import { useEffect, useState } from 'react'
import { Video } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'

export default function Teleconsultation() {
  const { rendezVousId } = useParams()
  const [rdv, setRdv] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rendez_vous').select('*').eq('id', rendezVousId).maybeSingle()
      setRdv(data)
      setChargement(false)
    })()
  }, [rendezVousId])

  if (chargement) return <Loader />
  if (!rdv) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-ardoise">Rendez-vous introuvable.</div>
  if (rdv.statut !== 'confirme') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-ardoise">Ce rendez-vous n'est pas (ou plus) confirmé.</p>
        <Link to="/" className="text-foret font-semibold">Retour à l'accueil</Link>
      </div>
    )
  }

  const salle = rdv.salle_teleconsultation || `sante-ci-${rdv.id}`
  const urlJitsi = `https://meet.jit.si/${salle}#config.prejoinPageEnabled=true&config.requireDisplayName=false&config.disableDeepLinking=true&config.enableWelcomePage=false`

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold text-charbon flex items-center gap-2">
          <Video className="text-foret" size={22} /> Salle de téléconsultation
        </h1>
        <span className="text-xs px-2.5 py-1 rounded-full bg-foret-light text-foret-dark font-semibold">Connexion chiffrée</span>
      </div>
      <div className="carte overflow-hidden aspect-video">
        <iframe
          src={urlJitsi}
          title="Téléconsultation Santé-CI"
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0"
        />
      </div>
      <p className="text-xs text-ardoise mt-3">
        Cette salle utilise Jitsi Meet, une solution de visioconférence libre. Aucun compte n'est
        nécessaire pour la rejoindre : indiquez juste votre nom à l'écran d'accueil. Pour une
        intégration en marque blanche, une instance Jitsi auto-hébergée peut remplacer ce lien.
      </p>
    </div>
  )
}
