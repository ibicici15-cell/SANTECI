import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('')
  const [chargement, setChargement] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')

  const envoyer = async (e) => {
    e.preventDefault()
    setChargement(true)
    setErreur('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
    setChargement(false)
    if (error) { setErreur("L'envoi a échoué : " + error.message); return }
    setEnvoye(true)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-charbon">Mot de passe oublié</h1>
      <p className="text-ardoise text-sm mt-1">
        Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>

      {envoye ? (
        <div className="carte p-6 mt-6">
          <p className="text-sm text-foret font-medium">✓ E-mail envoyé (si ce compte existe).</p>
          <p className="text-sm text-ardoise mt-2">
            Vérifiez votre boîte de réception (et vos spams), puis cliquez sur le lien reçu pour
            choisir un nouveau mot de passe.
          </p>
        </div>
      ) : (
        <form onSubmit={envoyer} className="carte p-6 mt-6 space-y-4">
          {erreur && <p className="text-sm text-alerte bg-alerte/10 rounded-lg px-3 py-2">{erreur}</p>}
          <div>
            <label className="etiquette">Adresse e-mail</label>
            <input type="email" required autoFocus className="champ" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button disabled={chargement} className="btn-primaire w-full">
            {chargement ? 'Envoi…' : 'Envoyer le lien'}
          </button>
        </form>
      )}

      <p className="text-sm text-ardoise text-center mt-6">
        <Link to="/connexion" className="text-foret font-semibold">← Retour à la connexion</Link>
      </p>
    </div>
  )
}
