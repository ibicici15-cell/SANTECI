import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ChampMotDePasse from '../components/ChampMotDePasse'

const TABLEAU_DE_BORD_PAR_ROLE = {
  patient: '/patient/tableau-de-bord',
  professionnel: '/professionnel/tableau-de-bord',
  etablissement: '/etablissement/tableau-de-bord',
  laboratoire: '/laboratoire/tableau-de-bord',
  admin: '/admin/tableau-de-bord',
}

export default function Connexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)
  const navigate = useNavigate()
  const { synchroniserSession } = useAuth()

  const seConnecter = async (e) => {
    e.preventDefault()
    setErreur('')
    setChargement(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) {
      setChargement(false)
      setErreur(
        error.message.includes('Invalid login')
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : error.message
      )
      return
    }

    const { data: profil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    // Important : on attend explicitement que le contexte d'authentification
    // ait bien récupéré la session AVANT de naviguer, sinon la route
    // protégée peut se déclencher avant que le contexte ne soit prêt et
    // renvoyer vers /connexion.
    await synchroniserSession()

    setChargement(false)
    navigate(TABLEAU_DE_BORD_PAR_ROLE[profil?.role] || '/')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-charbon">Connexion</h1>
      <p className="text-ardoise text-sm mt-1">Accédez à votre espace Santé-CI.</p>

      <form onSubmit={seConnecter} className="carte p-6 mt-6 space-y-4">
        {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}
        <div>
          <label className="etiquette">Adresse e-mail</label>
          <input type="email" required autoFocus className="champ" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="etiquette">Mot de passe</label>
            <Link to="/mot-de-passe-oublie" className="text-xs text-foret font-semibold">Mot de passe oublié ?</Link>
          </div>
          <ChampMotDePasse required value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
        </div>
        <button disabled={chargement} className="btn-primaire w-full">
          {chargement ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="text-sm text-ardoise text-center mt-6">
        Pas encore de compte ? <Link to="/inscription" className="text-foret font-semibold">Créer un compte</Link>
      </p>
    </div>
  )
}
