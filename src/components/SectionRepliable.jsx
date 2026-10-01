import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Section repliable avec titre + compteur, pour éviter que les listes
 * longues (professionnels validés, demandes, historique...) n'allongent
 * indéfiniment la page. `defautOuvert` contrôle l'état initial.
 */
export default function SectionRepliable({ titre, compte, defautOuvert = false, enfants, children }) {
  const [ouvert, setOuvert] = useState(defautOuvert)
  const contenu = enfants ?? children

  return (
    <div className="mt-10">
      <button
        onClick={() => setOuvert(o => !o)}
        className="w-full flex items-center justify-between py-2 border-b border-ligne"
      >
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          {titre}
          {typeof compte === 'number' && (
            <span className="text-xs font-donnee px-2 py-0.5 rounded-full bg-charbon/8 text-ardoise">{compte}</span>
          )}
        </h2>
        <ChevronDown size={18} className={`text-ardoise transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && <div className="mt-3">{contenu}</div>}
    </div>
  )
}
