import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { urlSignee } from '../lib/stockage'
import Loader from '../components/Loader'

function calculerAge(dateNaissance) {
  if (!dateNaissance) return null
  const naissance = new Date(dateNaissance)
  const diff = new Date() - naissance
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function FichePatient() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [dossier, setDossier] = useState(null)
  const [documents, setDocuments] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ data: patientData }, { data: dossierData }, { data: docsData }] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).maybeSingle(),
        supabase.from('dossiers_medicaux').select('*').eq('patient_id', id).maybeSingle(),
        supabase.from('documents_medicaux').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      ])
      setPatient(patientData)
      setDossier(dossierData)

      const docsAvecUrl = await Promise.all(
        (docsData || []).map(async d => ({ ...d, urlSignee: await urlSignee('documents-medicaux', d.fichier_url) }))
      )
      setDocuments(docsAvecUrl)
      setChargement(false)
    })()
  }, [id])

  if (chargement) return <Loader />
  if (!patient) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-ardoise">Patient introuvable.</div>

  const age = calculerAge(patient.date_naissance)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl2 bg-foret-light flex items-center justify-center font-display font-bold text-foret text-lg shrink-0">
            {patient.prenom?.[0]}{patient.nom?.[0]}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-charbon">{patient.prenom} {patient.nom}</h1>
            <p className="text-ardoise text-sm">
              {age !== null && `${age} ans`}{patient.sexe && ` · ${patient.sexe}`}{patient.ville && ` · ${patient.ville}`}
            </p>
          </div>
        </div>
        <Link to="/professionnel/messagerie" className="btn-secondaire !py-2 !px-4 text-sm shrink-0">Écrire au patient</Link>
      </div>

      <h2 className="font-display font-semibold text-lg mt-8 mb-3">Dossier médical</h2>
      {!dossier ? (
        <p className="text-ardoise text-sm">Ce patient n'a pas encore renseigné de dossier médical.</p>
      ) : (
        <div className="carte p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p><span className="text-ardoise">Groupe sanguin :</span> {dossier.groupe_sanguin || '—'}</p>
          </div>
          <div>
            <p className="text-ardoise text-sm">Allergies</p>
            <p className="text-sm">{dossier.allergies?.length ? dossier.allergies.join(', ') : 'Aucune renseignée'}</p>
          </div>
          <div>
            <p className="text-ardoise text-sm">Maladies chroniques</p>
            <p className="text-sm">{dossier.maladies_chroniques?.length ? dossier.maladies_chroniques.join(', ') : 'Aucune renseignée'}</p>
          </div>
          <div>
            <p className="text-ardoise text-sm">Traitements en cours</p>
            <p className="text-sm">{dossier.traitements_en_cours?.length ? dossier.traitements_en_cours.join(', ') : 'Aucun renseigné'}</p>
          </div>
          <div>
            <p className="text-ardoise text-sm">Antécédents</p>
            <p className="text-sm">{dossier.antecedents || 'Aucun renseigné'}</p>
          </div>
        </div>
      )}

      <h2 className="font-display font-semibold text-lg mt-8 mb-3">Documents médicaux</h2>
      <div className="space-y-2">
        {documents.length === 0 && <p className="text-ardoise text-sm">Aucun document.</p>}
        {documents.map(doc => (
          <a key={doc.id} href={doc.urlSignee || '#'} target="_blank" rel="noreferrer" className="carte p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{doc.titre}</p>
              <p className="text-xs text-ardoise">{doc.type_document}</p>
            </div>
            <span className="text-foret text-sm font-semibold">Ouvrir →</span>
          </a>
        ))}
      </div>
    </div>
  )
}
