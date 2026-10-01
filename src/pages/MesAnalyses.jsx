import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { urlSignee } from '../lib/stockage'
import { formaterFCFA, libelleModeRetrait } from '../lib/constantes'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import PointNonLu from '../components/PointNonLu'
import useEntitesNonLues from '../hooks/useEntitesNonLues'
import { marquerEntiteLue } from '../lib/notifications'

const LIEN = '/mes-analyses'

export default function MesAnalyses() {
  const { utilisateur, role } = useAuth()
  const [demandes, setDemandes] = useState([])
  const [chargement, setChargement] = useState(true)
  const nonLus = useEntitesNonLues(utilisateur.id, LIEN)

  const consulter = (id) => {
    if (nonLus.has(id)) marquerEntiteLue(utilisateur.id, LIEN, id)
  }

  useEffect(() => {
    (async () => {
      const colonne = role === 'patient' ? 'demandeur_patient_id' : 'demandeur_professionnel_id'
      const { data } = await supabase
        .from('demandes_analyse')
        .select('*, laboratoires(nom, ville), prestations_labo(nom_analyse)')
        .eq(colonne, utilisateur.id)
        .order('created_at', { ascending: false })

      const avecUrl = await Promise.all(
        (data || []).map(async d => ({ ...d, urlResultat: d.fichier_resultat ? await urlSignee('resultats-analyses', d.fichier_resultat) : null }))
      )
      setDemandes(avecUrl)
      setChargement(false)
    })()
  }, [utilisateur.id, role])

  if (chargement) return <Loader />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon flex items-center gap-2">
        <FlaskConical className="text-foret" size={24} /> Mes analyses
      </h1>

      <div className="space-y-3 mt-6">
        {demandes.length === 0 && <p className="text-ardoise text-sm">Aucune demande d'analyse pour le moment.</p>}
        {demandes.map(d => (
          <div key={d.id} onClick={() => consulter(d.id)} className="carte p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium flex items-center gap-2"><PointNonLu actif={nonLus.has(d.id)} /> {d.laboratoires?.nom} — {d.laboratoires?.ville}</p>
                <p className="text-sm text-ardoise">{d.prestations_labo?.nom_analyse || 'Demande de devis'}</p>
              </div>
              <Badge statut={d.statut} />
            </div>
            {d.statut === 'confirme' && (
              <p className="text-sm text-ardoise mt-2">
                {formaterFCFA(d.montant)} · {libelleModeRetrait(d.mode_retrait)}
                {d.date_livraison_prevue && ` · livraison prévue le ${new Date(d.date_livraison_prevue).toLocaleDateString('fr-FR')}`}
              </p>
            )}
            {d.commentaire_labo && <p className="text-sm text-charbon mt-2">Commentaire du labo : {d.commentaire_labo}</p>}
            {d.urlResultat && (
              <a href={d.urlResultat} target="_blank" rel="noreferrer" className="text-foret text-sm font-semibold mt-2 inline-block">
                Ouvrir le résultat →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
