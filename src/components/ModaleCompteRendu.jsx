import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { televerserFichier } from '../lib/stockage'

/**
 * Fenêtre de rédaction du compte-rendu (+ ordonnance optionnelle) pour un
 * rendez-vous confirmé. Aucune contrainte de date passée : le professionnel
 * peut la rédiger dès que le rendez-vous est confirmé, depuis n'importe quel
 * écran qui liste ses rendez-vous (tableau de bord ou historique complet).
 */
export default function ModaleCompteRendu({ rdv, utilisateurId, onFerme, onTermine }) {
  const [note, setNote] = useState({ observations: '', diagnostic: '', recommandations: '' })
  const [ordonnance, setOrdonnance] = useState({ contenu: '', examens: '' })
  const [fichierOrdonnance, setFichierOrdonnance] = useState(null)
  const [enregistrement, setEnregistrement] = useState(false)

  const terminerAvecCompteRendu = async () => {
    setEnregistrement(true)

    const { data: consultation } = await supabase.from('consultations').insert({
      rendez_vous_id: rdv.id,
      observations: note.observations,
      diagnostic: note.diagnostic,
      recommandations: note.recommandations,
    }).select().single()

    // Le compte-rendu (et son ordonnance éventuelle, affichée avec lui
    // dans "Mes comptes-rendus") n'apparaissaient auparavant nulle part
    // côté patient : une seule notification par consultation suffit
    // désormais, l'ordonnance étant rattachée au même endroit.
    await supabase.from('notifications').insert({
      destinataire_id: rdv.patient_id,
      type: 'document_disponible',
      titre: 'Compte-rendu disponible',
      contenu: 'Votre professionnel a ajouté un compte-rendu suite à votre consultation.',
      lien: '/patient/comptes-rendus',
      entite_id: consultation.id,
    })

    if (ordonnance.contenu.trim()) {
      let cheminFichier = null
      if (fichierOrdonnance) {
        try {
          const { chemin } = await televerserFichier('ordonnances', fichierOrdonnance, rdv.patient_id)
          cheminFichier = chemin
        } catch (err) {
          console.error('Téléversement ordonnance échoué', err)
        }
      }

      await supabase.from('ordonnances').insert({
        consultation_id: consultation.id,
        patient_id: rdv.patient_id,
        professionnel_id: utilisateurId,
        contenu: ordonnance.contenu,
        examens_prescrits: ordonnance.examens.split(',').map(s => s.trim()).filter(Boolean),
        fichier_url: cheminFichier,
      })
    }

    await supabase.from('rendez_vous').update({ statut: 'termine' }).eq('id', rdv.id)
    setEnregistrement(false)
    onTermine?.()
  }

  return (
    <div className="fixed inset-0 bg-charbon/40 flex items-center justify-center p-4 z-50 overflow-y-auto py-10">
      <div className="carte p-6 max-w-lg w-full">
        <h2 className="font-display font-semibold text-lg mb-4">
          Compte-rendu — {rdv.patients?.prenom} {rdv.patients?.nom}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="etiquette">Observations</label>
            <textarea rows={2} className="champ" value={note.observations} onChange={e => setNote(n => ({ ...n, observations: e.target.value }))} />
          </div>
          <div>
            <label className="etiquette">Diagnostic</label>
            <textarea rows={2} className="champ" value={note.diagnostic} onChange={e => setNote(n => ({ ...n, diagnostic: e.target.value }))} />
          </div>
          <div>
            <label className="etiquette">Recommandations</label>
            <textarea rows={2} className="champ" value={note.recommandations} onChange={e => setNote(n => ({ ...n, recommandations: e.target.value }))} />
          </div>

          <div className="border-t border-ligne pt-3 mt-3">
            <p className="font-medium text-sm mb-2">Ordonnance (facultatif)</p>
            <label className="etiquette">Contenu (médicaments, posologie)</label>
            <textarea rows={2} className="champ" value={ordonnance.contenu} onChange={e => setOrdonnance(o => ({ ...o, contenu: e.target.value }))} />
            <label className="etiquette mt-2">Examens prescrits (séparés par des virgules)</label>
            <input className="champ" value={ordonnance.examens} onChange={e => setOrdonnance(o => ({ ...o, examens: e.target.value }))} />
            <label className="etiquette mt-2">Joindre un fichier (facultatif)</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setFichierOrdonnance(e.target.files?.[0] || null)} className="text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={terminerAvecCompteRendu} disabled={enregistrement} className="btn-primaire flex-1">
            {enregistrement ? 'Enregistrement…' : 'Enregistrer et clôturer'}
          </button>
          <button onClick={onFerme} className="btn-fantome">Annuler</button>
        </div>
      </div>
    </div>
  )
}
