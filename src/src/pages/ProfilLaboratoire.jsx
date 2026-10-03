import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { televerserFichier } from '../lib/stockage'
import { VILLES_CI, MOYENS_PAIEMENT, MODES_RETRAIT_LABO, TYPES_ANALYSE_COURANTS } from '../lib/constantes'
import SelectAvecAutre from '../components/SelectAvecAutre'

export default function ProfilLaboratoire() {
  const { detail, utilisateur, rafraichirProfil } = useAuth()
  const [modeEdition, setModeEdition] = useState(false)

  useEffect(() => { rafraichirProfil() }, [])

  const [logoUrl, setLogoUrl] = useState(detail?.logo_url || '')
  const [envoiLogo, setEnvoiLogo] = useState(false)

  const [justificatifEnvoye, setJustificatifEnvoye] = useState(false)
  const documentPresent = justificatifEnvoye || !!detail?.document_justificatif_url
  const [envoiJustificatif, setEnvoiJustificatif] = useState(false)
  const [erreurJustificatif, setErreurJustificatif] = useState('')

  const changerLogo = async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setEnvoiLogo(true)
    try {
      const { url } = await televerserFichier('photos-profil', fichier, utilisateur.id, { publique: true })
      await supabase.from('laboratoires').update({ logo_url: url }).eq('id', utilisateur.id)
      setLogoUrl(url)
      rafraichirProfil()
    } finally {
      setEnvoiLogo(false)
    }
  }

  const televerserJustificatif = async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setErreurJustificatif('')
    setEnvoiJustificatif(true)
    try {
      const { chemin } = await televerserFichier('verification-professionnels', fichier, utilisateur.id)
      await supabase.from('laboratoires').update({ document_justificatif_url: chemin }).eq('id', utilisateur.id)
      setJustificatifEnvoye(true)
      rafraichirProfil()
    } catch (err) {
      setErreurJustificatif(err.message)
    } finally {
      setEnvoiJustificatif(false)
    }
  }

  const [form, setForm] = useState({
    nom: detail?.nom || '',
    ville: detail?.ville || '',
    adresse: detail?.adresse || '',
    description: detail?.description || '',
    moyens_paiement: detail?.moyens_paiement || [],
  })
  const [enregistrement, setEnregistrement] = useState(false)
  const [messageOk, setMessageOk] = useState(false)
  const [erreurEnregistrement, setErreurEnregistrement] = useState('')

  const basculer = (valeur) => {
    if (!modeEdition) return
    setForm(f => ({
      ...f,
      moyens_paiement: f.moyens_paiement.includes(valeur)
        ? f.moyens_paiement.filter(v => v !== valeur)
        : [...f.moyens_paiement, valeur],
    }))
  }

  const soumettre = async (e) => {
    e.preventDefault()
    if (!modeEdition) { setModeEdition(true); setMessageOk(false); return }

    setEnregistrement(true)
    setErreurEnregistrement('')
    const { error, data } = await supabase.from('laboratoires').update(form).eq('id', detail.id).select()
    setEnregistrement(false)

    if (error || !data || data.length === 0) {
      setErreurEnregistrement(error?.message || "L'enregistrement a échoué.")
      return
    }
    setModeEdition(false)
    setMessageOk(true)
    rafraichirProfil()
    setTimeout(() => setMessageOk(false), 4000)
  }

  const champDesactive = !modeEdition

  // ---------------------- Jours d'ouverture ----------------------
  const [joursOuverture, setJoursOuverture] = useState([])
  const [nouveauJour, setNouveauJour] = useState({ jour_semaine: '1', heure_debut: '08:00', heure_fin: '17:00' })
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  const chargerJours = async () => {
    const { data } = await supabase.from('jours_ouverture_labo').select('*').eq('labo_id', utilisateur.id).order('jour_semaine')
    setJoursOuverture(data || [])
  }

  const ajouterJour = async (e) => {
    e.preventDefault()
    await supabase.from('jours_ouverture_labo').insert({
      labo_id: utilisateur.id,
      jour_semaine: Number(nouveauJour.jour_semaine),
      heure_debut: nouveauJour.heure_debut,
      heure_fin: nouveauJour.heure_fin,
    })
    chargerJours()
  }

  const supprimerJour = async (id) => {
    await supabase.from('jours_ouverture_labo').delete().eq('id', id)
    setJoursOuverture(j => j.filter(x => x.id !== id))
  }

  // ---------------------- Catalogue de prestations ----------------------
  const [prestations, setPrestations] = useState([])
  const [nouvellePrestation, setNouvellePrestation] = useState({
    nom_analyse: '', prix: '', mode_retrait: 'sur_place', delai_heures: '', description: '',
  })
  const [nomAnalysePersonnalise, setNomAnalysePersonnalise] = useState(false)

  const chargerPrestations = async () => {
    const { data } = await supabase.from('prestations_labo').select('*').eq('labo_id', utilisateur.id).order('nom_analyse')
    setPrestations(data || [])
  }

  const ajouterPrestation = async (e) => {
    e.preventDefault()
    if (!nouvellePrestation.nom_analyse.trim()) return
    await supabase.from('prestations_labo').insert({
      labo_id: utilisateur.id,
      nom_analyse: nouvellePrestation.nom_analyse,
      prix: nouvellePrestation.prix ? Number(nouvellePrestation.prix) : null,
      moyens_paiement: form.moyens_paiement,
      mode_retrait: nouvellePrestation.mode_retrait,
      delai_heures: nouvellePrestation.delai_heures ? Number(nouvellePrestation.delai_heures) : null,
      description: nouvellePrestation.description || null,
    })
    setNouvellePrestation({ nom_analyse: '', prix: '', mode_retrait: 'sur_place', delai_heures: '', description: '' })
    setNomAnalysePersonnalise(false)
    chargerPrestations()
  }

  const supprimerPrestation = async (id) => {
    await supabase.from('prestations_labo').delete().eq('id', id)
    setPrestations(p => p.filter(x => x.id !== id))
  }

  useEffect(() => { chargerJours(); chargerPrestations() }, [utilisateur.id])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon">Mon profil laboratoire</h1>

      <div className="carte p-6 mt-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl2 bg-foret-light flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : (
            <span className="font-display font-bold text-foret text-xl">{detail?.nom?.[0]}</span>
          )}
        </div>
        <label className="btn-fantome cursor-pointer text-sm !py-2">
          {envoiLogo ? 'Envoi…' : 'Changer le logo'}
          <input type="file" accept="image/*" className="hidden" onChange={changerLogo} disabled={envoiLogo} />
        </label>
      </div>

      <div className="carte p-6 mt-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display font-semibold">Document justificatif</p>
          <p className="text-sm text-ardoise mt-1 max-w-md">
            Agrément ou autorisation d'exercice — nécessaire pour la validation par l'administrateur.
          </p>
          {detail?.valide_par_admin ? (
            <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-foret-light text-foret-dark font-semibold">Compte validé</span>
          ) : (
            <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-ocre/15 text-ocre font-semibold">
              {documentPresent ? 'Document envoyé — en attente de validation' : 'Document requis'}
            </span>
          )}
          {erreurJustificatif && <p className="text-xs text-alerte mt-1">{erreurJustificatif}</p>}
          {!detail?.valide_par_admin && detail?.motif_rejet && (
            <p className="text-xs text-alerte bg-alerte/10 rounded-lg px-2.5 py-1.5 mt-2 max-w-md">
              Précédent document refusé : {detail.motif_rejet}
            </p>
          )}
        </div>
        <label className="btn-fantome cursor-pointer text-sm !py-2 shrink-0">
          {envoiJustificatif ? 'Envoi…' : documentPresent ? 'Remplacer le document' : 'Téléverser un document'}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={televerserJustificatif} disabled={envoiJustificatif} />
        </label>
      </div>

      <form onSubmit={soumettre} className="carte p-6 mt-4 space-y-4">
        <div><label className="etiquette">Nom du laboratoire</label>
          <input disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiquette">Ville</label>
            <SelectAvecAutre disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" options={VILLES_CI} value={form.ville}
              onChange={v => setForm(f => ({ ...f, ville: v }))} placeholderAutre="Précisez votre ville" /></div>
          <div><label className="etiquette">Adresse</label>
            <input disabled={champDesactive} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} /></div>
        </div>

        <div><label className="etiquette">Description</label>
          <textarea disabled={champDesactive} rows={3} className="champ disabled:bg-charbon/5 disabled:text-ardoise" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

        <div>
          <label className="etiquette">Moyens de paiement acceptés</label>
          <div className="flex flex-wrap gap-2">
            {MOYENS_PAIEMENT.map(m => (
              <button type="button" key={m.valeur} onClick={() => basculer(m.valeur)} disabled={champDesactive}
                className={`text-sm px-3 py-1.5 rounded-full border ${form.moyens_paiement.includes(m.valeur) ? 'bg-ambre text-white border-ambre' : 'border-ligne text-ardoise'} ${champDesactive ? 'opacity-60 cursor-default' : ''}`}>
                {m.libelle}
              </button>
            ))}
          </div>
        </div>

        <button disabled={enregistrement} className="btn-primaire w-full">
          {modeEdition ? (enregistrement ? 'Enregistrement…' : 'Enregistrer mon profil') : 'Modifier mon profil'}
        </button>
        {messageOk && <p className="text-sm text-foret bg-foret-light rounded-lg px-3 py-2 text-center">✓ Profil mis à jour.</p>}
        {erreurEnregistrement && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2 text-center">{erreurEnregistrement}</p>}
      </form>

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">Jours d'ouverture</h2>
      <form onSubmit={ajouterJour} className="carte p-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="etiquette">Jour</label>
          <select className="champ" value={nouveauJour.jour_semaine} onChange={e => setNouveauJour(n => ({ ...n, jour_semaine: e.target.value }))}>
            {JOURS.map((j, i) => <option key={j} value={i}>{j}</option>)}
          </select>
        </div>
        <div><label className="etiquette">Ouverture</label>
          <input type="time" className="champ" value={nouveauJour.heure_debut} onChange={e => setNouveauJour(n => ({ ...n, heure_debut: e.target.value }))} /></div>
        <div><label className="etiquette">Fermeture</label>
          <input type="time" className="champ" value={nouveauJour.heure_fin} onChange={e => setNouveauJour(n => ({ ...n, heure_fin: e.target.value }))} /></div>
        <button className="btn-primaire">Ajouter</button>
      </form>
      <div className="space-y-2 mt-3">
        {joursOuverture.length === 0 && <p className="text-ardoise text-sm">Aucun jour d'ouverture renseigné.</p>}
        {joursOuverture.map(j => (
          <div key={j.id} className="carte p-4 flex items-center justify-between">
            <p className="font-medium">{JOURS[j.jour_semaine]} · {j.heure_debut?.slice(0, 5)} – {j.heure_fin?.slice(0, 5)}</p>
            <button onClick={() => supprimerJour(j.id)} className="text-alerte text-sm font-semibold">Supprimer</button>
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold text-lg mt-10 mb-3">Catalogue d'analyses</h2>
      <p className="text-ardoise text-sm mb-3">
        Facultatif, mais recommandé : un labo avec un catalogue rempli apparaît directement dans
        les recherches filtrées par type d'analyse, avec tarif et délai déjà visibles — moins de
        contact préalable nécessaire.
      </p>
      <form onSubmit={ajouterPrestation} className="carte p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiquette">Type d'analyse</label>
            {nomAnalysePersonnalise ? (
              <div className="flex gap-2">
                <input className="champ" placeholder="Précisez le type d'analyse" value={nouvellePrestation.nom_analyse} onChange={e => setNouvellePrestation(p => ({ ...p, nom_analyse: e.target.value }))} />
                <button type="button" onClick={() => { setNomAnalysePersonnalise(false); setNouvellePrestation(p => ({ ...p, nom_analyse: '' })) }} className="btn-fantome !py-2 !px-3 text-sm shrink-0">Liste</button>
              </div>
            ) : (
              <select className="champ" value={nouvellePrestation.nom_analyse}
                onChange={e => {
                  if (e.target.value === '__autre__') { setNomAnalysePersonnalise(true); setNouvellePrestation(p => ({ ...p, nom_analyse: '' })) }
                  else setNouvellePrestation(p => ({ ...p, nom_analyse: e.target.value }))
                }}>
                <option value="">Sélectionner…</option>
                {TYPES_ANALYSE_COURANTS.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__autre__">Autre (préciser)…</option>
              </select>
            )}</div>
          <div><label className="etiquette">Prix (FCFA)</label>
            <input type="number" min="0" className="champ" value={nouvellePrestation.prix} onChange={e => setNouvellePrestation(p => ({ ...p, prix: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiquette">Mode de retrait</label>
            <select className="champ" value={nouvellePrestation.mode_retrait} onChange={e => setNouvellePrestation(p => ({ ...p, mode_retrait: e.target.value }))}>
              {MODES_RETRAIT_LABO.map(m => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
            </select></div>
          <div><label className="etiquette">Délai de traitement (heures)</label>
            <input type="number" min="0" className="champ" placeholder="Ex : 24" value={nouvellePrestation.delai_heures} onChange={e => setNouvellePrestation(p => ({ ...p, delai_heures: e.target.value }))} /></div>
        </div>
        <div><label className="etiquette">Description (facultatif)</label>
          <input className="champ" value={nouvellePrestation.description} onChange={e => setNouvellePrestation(p => ({ ...p, description: e.target.value }))} /></div>
        <button className="btn-primaire w-full">Ajouter au catalogue</button>
      </form>
      <div className="space-y-2 mt-3">
        {prestations.length === 0 && <p className="text-ardoise text-sm">Catalogue vide pour le moment.</p>}
        {prestations.map(p => (
          <div key={p.id} className="carte p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{p.nom_analyse}</p>
              <p className="text-xs text-ardoise">
                {p.prix ? `${new Intl.NumberFormat('fr-FR').format(p.prix)} FCFA` : 'Prix non précisé'} ·
                {' '}{p.delai_heures ? `${p.delai_heures}h` : 'délai non précisé'} ·
                {' '}{p.mode_retrait === 'sur_place' ? 'Sur place' : 'En ligne'}
              </p>
            </div>
            <button onClick={() => supprimerPrestation(p.id)} className="text-alerte text-sm font-semibold shrink-0">Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  )
}
