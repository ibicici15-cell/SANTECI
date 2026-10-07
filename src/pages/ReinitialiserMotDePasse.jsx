import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ChampMotDePasse from '../components/ChampMotDePasse'

// Page atteinte via le lien reçu par e-mail (mot de passe oublié). Supabase
// dépose un jeton de récupération dans l'URL ; le client Supabase le
// détecte automatiquement (detectSessionInUrl, actif par défaut) et ouvre
// une session temporaire, le temps de choisir un nouveau mot de passe.
export default function ReinitialiserMotDePasse() {
  const navigate = useNavigate()
  const [pret, setPret] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [reussi, setReussi] = useState(false)

  useEffect(() => {
    // Laisse le temps au client Supabase de traiter le jeton présent dans
    // l'URL avant d'afficher le formulaire (sinon updateUser échouerait
    // faute de session).
    supabase.auth.getSession().then(() => setPret(true))
  }, [])

  const valider = async (e) => {
    e.preventDefault()
    setErreur('')
    if (motDePasse !== confirmation) { setErreur('Les deux mots de passe ne correspondent pas.'); return }
    if (motDePasse.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères.'); return }

    setChargement(true)
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    setChargement(false)
    if (error) { setErreur("La mise à jour a échoué : " + error.message + " (le lien a peut-être expiré — redemandez-en un nouveau)"); return }
    setReussi(true)
    setTimeout(() => navigate('/connexion'), 2500)
  }

  if (!pret) return null

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-charbon">Nouveau mot de passe</h1>
      <p className="text-ardoise text-sm mt-1">Choisissez un nouveau mot de passe pour votre compte.</p>

      {reussi ? (
        <div className="carte p-6 mt-6">
          <p className="text-sm text-foret font-medium">✓ Mot de passe mis à jour. Redirection…</p>
        </div>
      ) : (
        <form onSubmit={valider} className="carte p-6 mt-6 space-y-4">
          {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}
          <div>
            <label className="etiquette">Nouveau mot de passe</label>
            <ChampMotDePasse required minLength={6} autoFocus value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
          </div>
          <div>
            <label className="etiquette">Confirmer le mot de passe</label>
            <ChampMotDePasse required minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
          </div>
          <button disabled={chargement} className="btn-primaire w-full">
            {chargement ? 'Mise à jour…' : 'Valider'}
          </button>
        </form>
      )}
    </div>
  )
}
