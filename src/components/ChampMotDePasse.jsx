import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Champ mot de passe avec œil pour afficher/masquer la saisie — évite les
 * erreurs de frappe invisibles, surtout sur mobile.
 */
export default function ChampMotDePasse({ value, onChange, required, minLength, autoFocus, className = 'champ', placeholder }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={`${className} pr-11`}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ardoise hover:text-foret"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
