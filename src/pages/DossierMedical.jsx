import { useEffect, useState } from 'react'
import { FolderHeart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { televerserFichier, urlSignee } from '../lib/stockage'
import Loader from '../components/Loader'
import SelectAvecAutre from '../components/SelectAvecAutre'

const listeVersTexte = (arr) => (arr || []).join(', ')
const texteVersListe = (txt) => txt.split(',').map(s => s.trim()).filter(Boolean)

export default function DossierMedical() {
  const { utilisateur } = useAuth()
  const [dossier, setDossier] = useState(null)
  const [documents, setDocuments] = useState([])
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageOk, setMessageOk] = useState(false)
  const [envoiDocument, setEnvoiDocument] = useState(false)
  const [erreurDocument, setErreurDocument] = useState('')

  const [form, setForm] = useState({
    groupe_sanguin: '', allergies: '', maladies_chroniques: '', traitements_en_cours: '', antecedents: '',
  })

  const charger = async () => {
    const { data } = await supabase.from('dossiers_medicaux').select('*').eq('patient_id', utilisateur.id).maybeSingle()
    if (data) {
      setDossier(data)
      setForm({
        groupe_sanguin: data.groupe_sanguin || '',
        allergies: listeVersTexte(data.allergies),
        maladies_chroniques: listeVersTexte(data.maladies_chroniques),
        traitements_en_cours: listeVersTexte(data.traitements_en_cours),
        antecedents: data.antecedents || '',
      })
    }
    const { data: docs } = await supabase.from('documents_medicaux').select('*').eq('patient_id', utilisateur.id).order('created_at', { ascending: false })
    const docsAvecUrl = await Promise.all(
      (docs || []).map(async d => ({ ...d, urlSignee: await urlSignee('documents-medicaux', d.fichier_url) }))
    )
    setDocuments(docsAvecUrl)

    setChargement(false)
  }

  useEffect(() => { charger() }, [utilisateur.id])

  const enregistrer = async (e) => {
    e.preventDefault()
    setEnregistrement(true)
    const charge = {
      patient_id: utilisateur.id,
      groupe_sanguin: form.groupe_sanguin || null,
      allergies: texteVersListe(form.allergies),
      maladies_chroniques: texteVersListe(form.maladies_chroniques),
      traitements_en_cours: texteVersListe(form.traitements_en_cours),
      antecedents: form.antecedents || null,
    }
    if (dossier) {
      await supabase.from('dossiers_medicaux').update(charge).eq('id', dossier.id)
    } else {
      const { data } = await supabase.from('dossiers_medicaux').insert(charge).select().single()
      setDossier(data)
    }
    setEnregistrement(false)
    setMessageOk(true)
    setTimeout(() => setMessageOk(false), 2500)
  }

  const televerserDocument = async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreurDocument('')
    setEnvoiDocument(true)
    try {
      const { chemin } = await televerserFichier('documents-medicaux', fichier, utilisateur.id)
      await supabase.from('documents_medicaux').insert({
        patient_id: utilisateur.id,
        titre: fichier.name,
        type_document: 'autre',
        fichier_url: chemin,
        ajoute_par: utilisateur.id,
      })
      charger()
    } catch (err) {
      setErreurDocument(err.message)
    } finally {
      setEnvoiDocument(false)
    }
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon flex items-center gap-2">
        <FolderHeart className="text-foret" size={24} /> Mon dossier médical
      </h1>
      <p className="text-ardoise text-sm mt-1">
        Visible uniquement par vous et les professionnels avec qui vous avez un rendez-vous.
      </p>

      <form onSubmit={enregistrer} className="carte p-6 mt-6 space-y-4">
        {messageOk && <p className="text-sm text-foret bg-foret-light rounded-lg px-3 py-2">Dossier médical enregistré.</p>}

        <div>
          <label className="etiquette">Groupe sanguin</label>
          <SelectAvecAutre optionVide="Non renseigné" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} value={form.groupe_sanguin}
            onChange={v => setForm(f => ({ ...f, groupe_sanguin: v }))} placeholderAutre="Précisez (ex : Bombay)" />
        </div>
        <div>
          <label className="etiquette">Allergies (séparées par des virgules)</label>
          <input className="champ" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
        </div>
        <div>
          <label className="etiquette">Maladies chroniques</label>
          <input className="champ" value={form.maladies_chroniques} onChange={e => setForm(f => ({ ...f, maladies_chroniques: e.target.value }))} />
        </div>
        <div>
          <label className="etiquette">Traitements en cours</label>
          <input className="champ" value={form.traitements_en_cours} onChange={e => setForm(f => ({ ...f, traitements_en_cours: e.target.value }))} />
        </div>
        <div>
          <label className="etiquette">Antécédents médicaux</label>
          <textarea rows={3} className="champ" value={form.antecedents} onChange={e => setForm(f => ({ ...f, antecedents: e.target.value }))} />
        </div>

        <button disabled={enregistrement} className="btn-primaire w-full">
          {enregistrement ? 'Enregistrement…' : 'Enregistrer mon dossier'}
        </button>
      </form>

      <div className="flex items-center justify-between mt-10 mb-3">
        <h2 className="font-display font-semibold text-lg">Mes documents médicaux</h2>
        <label className="btn-fantome cursor-pointer text-sm !py-2">
          {envoiDocument ? 'Envoi…' : 'Ajouter un document'}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={televerserDocument} disabled={envoiDocument} />
        </label>
      </div>
      {erreurDocument && <p className="text-sm text-alerte mb-2">{erreurDocument}</p>}
      <div className="space-y-2">
        {documents.length === 0 && <p className="text-ardoise text-sm">Aucun document pour le moment.</p>}
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
