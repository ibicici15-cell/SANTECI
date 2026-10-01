import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { VILLES_CI } from '../lib/constantes'
import { useAuth } from '../context/AuthContext'
import SelectAvecAutre from '../components/SelectAvecAutre'

export default function InscriptionLaboratoire() {
  const navigate = useNavigate()
  const { synchroniserSession } = useAuth()
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', mot_de_passe: '',
    ville: '', adresse: '', description: '',
  })
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  const maj = (champ) => (e) => setForm(f => ({ ...f, [champ]: e.target.value }))

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.mot_de_passe })
    if (error) { setErreur(error.message); setChargement(false); return }

    const userId = data.user?.id
    if (!userId) {
      setErreur('Vérifiez votre boîte e-mail pour confirmer votre inscription avant de continuer.')
      setChargement(false)
      return
    }

    const { error: erreurProfil } = await supabase.from('profiles').insert({
      id: userId, role: 'laboratoire', email: form.email, telephone: form.telephone,
    })
    if (erreurProfil) { setErreur(erreurProfil.message); setChargement(false); return }

    const { error: erreurLabo } = await supabase.from('laboratoires').insert({
      id: userId,
      nom: form.nom,
      ville: form.ville,
      adresse: form.adresse,
      description: form.description,
    })
    setChargement(false)
    if (erreurLabo) { setErreur(erreurLabo.message); return }

    await synchroniserSession()
    navigate('/laboratoire/tableau-de-bord')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-charbon">Créer mon espace laboratoire</h1>
      <p className="text-ardoise text-sm mt-1">
        1 mois d'essai gratuit inclus. Une fois inscrit, complétez votre profil (justificatif,
        jours d'ouverture, catalogue d'analyses) pour être validé par notre équipe et visible
        dans les recherches.
      </p>

      <form onSubmit={soumettre} className="carte p-6 mt-6 space-y-4">
        {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}

        <div>
          <label className="etiquette">Nom du laboratoire</label>
          <input required autoFocus className="champ" value={form.nom} onChange={maj('nom')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiquette">Adresse e-mail</label>
            <input type="email" required className="champ" value={form.email} onChange={maj('email')} />
          </div>
          <div>
            <label className="etiquette">Téléphone</label>
            <input type="tel" placeholder="+225 07 00 00 00 00" required className="champ" value={form.telephone} onChange={maj('telephone')} />
          </div>
        </div>

        <div>
          <label className="etiquette">Ville</label>
          <SelectAvecAutre required optionVide="Sélectionner…" options={VILLES_CI} value={form.ville}
            onChange={v => setForm(f => ({ ...f, ville: v }))} placeholderAutre="Précisez votre ville" />
        </div>

        <div>
          <label className="etiquette">Adresse complète</label>
          <input className="champ" value={form.adresse} onChange={maj('adresse')} />
        </div>

        <div>
          <label className="etiquette">Description courte</label>
          <textarea rows={3} className="champ" value={form.description} onChange={maj('description')} />
        </div>

        <div>
          <label className="etiquette">Mot de passe</label>
          <input type="password" required minLength={6} className="champ" value={form.mot_de_passe} onChange={maj('mot_de_passe')} />
        </div>

        <button disabled={chargement} className="btn-secondaire w-full">
          {chargement ? 'Création…' : 'Créer mon espace laboratoire'}
        </button>
      </form>

      <p className="text-sm text-ardoise text-center mt-6">
        Déjà un compte ? <Link to="/connexion" className="text-foret font-semibold">Se connecter</Link>
      </p>
    </div>
  )
}
