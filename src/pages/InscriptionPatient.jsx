import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ChampMotDePasse from '../components/ChampMotDePasse'

export default function InscriptionPatient() {
  const navigate = useNavigate()
  const { synchroniserSession } = useAuth()
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', mot_de_passe: '',
    date_naissance: '', sexe: '',
  })
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  const maj = (champ) => (e) => setForm(f => ({ ...f, [champ]: e.target.value }))

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.mot_de_passe,
    })
    if (error) { setErreur(error.message); setChargement(false); return }

    const userId = data.user?.id
    if (!userId) {
      setErreur('Vérifiez votre boîte e-mail pour confirmer votre inscription avant de continuer.')
      setChargement(false)
      return
    }

    const { error: erreurProfil } = await supabase.from('profiles').insert({
      id: userId, role: 'patient', email: form.email, telephone: form.telephone,
    })
    if (erreurProfil) { setErreur(erreurProfil.message); setChargement(false); return }

    const { error: erreurPatient } = await supabase.from('patients').insert({
      id: userId,
      nom: form.nom,
      prenom: form.prenom,
      date_naissance: form.date_naissance || null,
      sexe: form.sexe || null,
    })
    setChargement(false)
    if (erreurPatient) { setErreur(erreurPatient.message); return }

    // Important : on attend que le contexte d'authentification ait bien
    // récupéré le rôle avant de rediriger, sinon la route protégée peut
    // rejeter la navigation et renvoyer vers /connexion.
    await synchroniserSession()
    navigate('/patient/tableau-de-bord')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-charbon">Créer mon compte patient</h1>
      <p className="text-ardoise text-sm mt-1">Gratuit, sans engagement.</p>

      <form onSubmit={soumettre} className="carte p-6 mt-6 space-y-4">
        {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiquette">Prénom</label>
            <input required className="champ" value={form.prenom} onChange={maj('prenom')} />
          </div>
          <div>
            <label className="etiquette">Nom</label>
            <input required autoFocus className="champ" value={form.nom} onChange={maj('nom')} />
          </div>
        </div>

        <div>
          <label className="etiquette">Adresse e-mail</label>
          <input type="email" required className="champ" value={form.email} onChange={maj('email')} />
        </div>

        <div>
          <label className="etiquette">Téléphone</label>
          <input type="tel" placeholder="+225 07 00 00 00 00" className="champ" value={form.telephone} onChange={maj('telephone')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="etiquette">Date de naissance</label>
            <input type="date" className="champ" value={form.date_naissance} onChange={maj('date_naissance')} />
          </div>
          <div>
            <label className="etiquette">Sexe</label>
            <select className="champ" value={form.sexe} onChange={maj('sexe')}>
              <option value="">—</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        <div>
          <label className="etiquette">Mot de passe</label>
          <ChampMotDePasse required minLength={6} value={form.mot_de_passe} onChange={maj('mot_de_passe')} />
        </div>

        <button disabled={chargement} className="btn-primaire w-full">
          {chargement ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-sm text-ardoise text-center mt-6">
        Déjà un compte ? <Link to="/connexion" className="text-foret font-semibold">Se connecter</Link>
      </p>
    </div>
  )
}
