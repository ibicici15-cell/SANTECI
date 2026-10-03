import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { televerserFichier } from '../lib/stockage'
import { SPECIALITES_LISTE, VILLES_CI, LANGUES, MOYENS_PAIEMENT } from '../lib/constantes'
import SelectAvecAutre from '../components/SelectAvecAutre'
import { marquerLuParLien } from '../lib/notifications'

export default function ProfilProfessionnel() {
  const { detail, utilisateur, rafraichirProfil } = useAuth()
  const [modeEdition, setModeEdition] = useState(false)

  useEffect(() => { rafraichirProfil() }, [])
  useEffect(() => { marquerLuParLien(utilisateur.id, '/professionnel/profil') }, [utilisateur.id])

  const [photoUrl, setPhotoUrl] = useState(detail?.photo_url || '')
  const [envoiPhoto, setEnvoiPhoto] = useState(false)
  const [erreurPhoto, setErreurPhoto] = useState('')

  const [justificatifEnvoye, setJustificatifEnvoye] = useState(false)
  const documentPresent = justificatifEnvoye || !!detail?.document_justificatif_url
  const [envoiJustificatif, setEnvoiJustificatif] = useState(false)
  const [erreurJustificatif, setErreurJustificatif] = useState('')

  const changerPhoto = async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreurPhoto('')
    setEnvoiPhoto(true)
    try {
      const { url } = await televerserFichier('photos-profil', fichier, utilisateur.id, { publique: true })
      await supabase.from('professionnels').update({ photo_url: url }).eq('id', utilisateur.id)
      setPhotoUrl(url)
      rafraichirProfil()
    } catch (err) {
      setErreurPhoto(err.message)
    } finally {
      setEnvoiPhoto(false)
    }
  }

  const televerserJustificatif = async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreurJustificatif('')
    setEnvoiJustificatif(true)
    try {
      const { chemin } = await televerserFichier('verification-professionnels', fichier, utilisateur.id)
      await supabase.from('professionnels').update({ document_justificatif_url: chemin }).eq('id', utilisateur.id)
      setJustificatifEnvoye(true)
      rafraichirProfil()
    } catch (err) {
      setErreurJustificatif(err.message)
    } finally {
      setEnvoiJustificatif(false)
    }
  }

  const [form, setForm] = useState({
    prenom: detail?.prenom || '',
    nom: detail?.nom || '',
    specialite: detail?.specialite || '',
    ville: detail?.ville || '',
    adresse_cabinet: detail?.adresse_cabinet || '',
    tarif_consultation: detail?.tarif_consultation || '',
    biographie: detail?.biographie || '',
    experience_annees: detail?.experience_annees || 0,
    langues_parlees: detail?.langues_parlees || ['Français'],
    modes_consultation: detail?.modes_consultation || ['cabinet'],
    moyens_paiement: detail?.moyens_paiement || [],
    accepte_collaborations: detail?.accepte_collaborations || false,
  })
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageOk, setMessageOk] = useState(false)
  const [erreurEnregistrement, setErreurEnregistrement] = useState('')

  const basculer = (champ, valeur) => {
    if (!modeEdition) return
    setForm(f => {
      const liste = f[champ].includes(valeur) ? f[champ].filter(v => v !== valeur) : [...f[champ], valeur]
      return { ...f, [champ]: liste }
    })
  }

  const soumettre = async (e) => {
    e.preventDefault()

    // Premier clic (mode vue) : on passe simplement en mode édition.
    if (!modeEdition) {
      setModeEdition(true)
      setMessageOk(false)
      return
    }

    // Deuxième clic (mode édition) : on enregistre réellement.
    setEnregistrement(true)
    setErreurEnregistrement('')
    setMessageOk(false)

    const { error, data } = await supabase.from('professionnels').update({
      ...form,
      tarif_consultation: form.tarif_consultation ? Number(form.tarif_consultation) : null,
      experience_annees: Number(form.experience_annees) || 0,
    }).eq('id', detail.id).select()

    setEnregistrement(false)

    if (error || !data || data.length === 0) {
      setErreurEnregistrement(
        error?.message || "L'enregistrement a échoué (aucune ligne modifiée). Vérifiez votre connexion et réessayez."
      )
      return
    }

    setModeEdition(false)
    setMessageOk(true)
    rafraichirProfil()
    setTimeout(() => setMessageOk(false), 4000)
  }

  const champDesactive = !modeEdition

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Mon profil</h1>

      <div className="carte p-6 mt-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl2 bg-foret-light flex items-center justify-center overflow-hidden shrink-0">
          {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : (
            <span className="font-display font-bold text-foret text-xl">{detail?.prenom?.[0]}{detail?.nom?.[0]}</span>
          )}
        </div>
        <div>
          <label className="btn-fantome cursor-pointer text-sm !py-2">
            {envoiPhoto ? 'Envoi…' : 'Changer ma photo'}
            <input type="file" accept="image/*" className="hidden" onChange={changerPhoto} disabled={envoiPhoto} />
          </label>
          {erreurPhoto && <p className="text-xs text-alerte mt-1">{erreurPhoto}</p>}
        </div>
      </div>

      <div className="carte p-6 mt-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display font-semibold">Document justificatif d'exercice</p>
          <p className="text-sm text-ardoise mt-1 max-w-md">
            Carte professionnelle, diplôme ou attestation d'exercice — nécessaire pour que
            l'administrateur valide votre compte. Sans validation, vous n'apparaissez pas dans
            les recherches et ne pouvez pas recevoir de patients.
          </p>
          {detail?.valide_par_admin ? (
            <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-foret-light text-foret-dark font-semibold">
              Compte validé
            </span>
          ) : (
            <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-ocre/15 text-ocre font-semibold">
              {documentPresent ? 'Document envoyé — en attente de validation' : 'Document requis'}
            </span>
          )}
          {erreurJustificatif && <p className="text-xs text-alerte mt-1">{erreurJustificatif}</p>}
          {!detail?.valide_par_admin && detail?.motif_rejet && (
            <p className="text-xs text-alerte bg-alerte/10 rounded-lg px-2.5 py-1.5 mt-2 max-w-md">
              Votre précédent document a été refusé : {detail.motif_rejet}. Merci d'en téléverser un nouveau.
            </p>
          )}
        </div>
        <label className="btn-fantome cursor-pointer text-sm !py-2 shrink-0">
          {envoiJustificatif ? 'Envoi…' : documentPresent ? 'Remplacer le document' : 'Téléverser un document'}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={televerserJustificatif} disabled={envoiJustificatif} />
        </label>
      </div>

      <form onSubmit={soumettre} className="carte p-6 mt-4 space-y-4">

        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiquette">Prénom</label>
            <input disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} /></div>
          <div><label className="etiquette">Nom</label>
            <input disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiquette">Spécialité</label>
            <SelectAvecAutre disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" options={SPECIALITES_LISTE} value={form.specialite}
              onChange={v => setForm(f => ({ ...f, specialite: v }))} placeholderAutre="Précisez votre spécialité" />
          </div>
          <div>
            <label className="etiquette">Ville</label>
            <SelectAvecAutre disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" options={VILLES_CI} value={form.ville}
              onChange={v => setForm(f => ({ ...f, ville: v }))} placeholderAutre="Précisez votre ville" />
          </div>
        </div>

        <div><label className="etiquette">Adresse du cabinet</label>
          <input disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.adresse_cabinet} onChange={e => setForm(f => ({ ...f, adresse_cabinet: e.target.value }))} /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiquette">Tarif consultation (FCFA)</label>
            <input disabled={champDesactive} type="number" min="0" className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.tarif_consultation} onChange={e => setForm(f => ({ ...f, tarif_consultation: e.target.value }))} /></div>
          <div><label className="etiquette">Années d'expérience</label>
            <input disabled={champDesactive} type="number" min="0" className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.experience_annees} onChange={e => setForm(f => ({ ...f, experience_annees: e.target.value }))} /></div>
        </div>

        <div><label className="etiquette">Biographie</label>
          <textarea disabled={champDesactive} rows={3} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.biographie} onChange={e => setForm(f => ({ ...f, biographie: e.target.value }))} /></div>

        <div>
          <label className="etiquette">Langues parlées</label>
          <div className="flex flex-wrap gap-2">
            {LANGUES.map(l => (
              <button type="button" key={l} onClick={() => basculer('langues_parlees', l)} disabled={champDesactive}
                className={`text-sm px-3 py-1.5 rounded-full border ${form.langues_parlees.includes(l) ? 'bg-foret text-white border-foret' : 'border-ligne text-ardoise'} ${champDesactive ? 'opacity-60 cursor-default' : ''}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="etiquette">Modes de consultation proposés</label>
          <div className="flex gap-2">
            {[{ v: 'cabinet', l: 'Cabinet' }, { v: 'teleconsultation', l: 'Téléconsultation' }].map(m => (
              <button type="button" key={m.v} onClick={() => basculer('modes_consultation', m.v)} disabled={champDesactive}
                className={`text-sm px-3 py-1.5 rounded-full border ${form.modes_consultation.includes(m.v) ? 'bg-foret text-white border-foret' : 'border-ligne text-ardoise'} ${champDesactive ? 'opacity-60 cursor-default' : ''}`}>
                {m.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="etiquette">Moyens de paiement acceptés (pour vos consultations)</label>
          <div className="flex flex-wrap gap-2">
            {MOYENS_PAIEMENT.map(m => (
              <button type="button" key={m.valeur} onClick={() => basculer('moyens_paiement', m.valeur)} disabled={champDesactive}
                className={`text-sm px-3 py-1.5 rounded-full border ${form.moyens_paiement.includes(m.valeur) ? 'bg-ambre text-white border-ambre' : 'border-ligne text-ardoise'} ${champDesactive ? 'opacity-60 cursor-default' : ''}`}>
                {m.libelle}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ligne pt-4">
          <div>
            <p className="etiquette !mb-0.5">Collaboration entre confrères</p>
            <p className="text-xs text-ardoise max-w-sm">
              Si activé, d'autres professionnels validés pourront vous solliciter pour un avis
              ou une prise en charge (ex : un généraliste cherchant un chirurgien). Vous pouvez
              toujours refuser une demande précise.
            </p>
          </div>
          <button
            type="button"
            disabled={champDesactive}
            onClick={() => modeEdition && setForm(f => ({ ...f, accepte_collaborations: !f.accepte_collaborations }))}
            className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${form.accepte_collaborations ? 'bg-foret' : 'bg-charbon/15'} ${champDesactive ? 'opacity-60' : ''}`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${form.accepte_collaborations ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <button disabled={enregistrement} className="btn-primaire w-full">
          {modeEdition ? (enregistrement ? 'Enregistrement…' : 'Enregistrer mon profil') : 'Modifier mon profil'}
        </button>

        {messageOk && (
          <p className="text-sm text-foret bg-foret-light rounded-lg px-3 py-2 text-center">
            ✓ Profil mis à jour avec succès.
          </p>
        )}
        {erreurEnregistrement && (
          <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2 text-center">{erreurEnregistrement}</p>
        )}
      </form>
    </div>
  )
}
