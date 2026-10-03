import { useState, useEffect } from 'react'

const AUTRE = '__autre__'

/**
 * Liste déroulante avec une option « Autre (préciser) » permanente.
 * Quand l'utilisateur choisit « Autre », un champ texte apparaît et la
 * valeur saisie est acceptée telle quelle (elle remplace la valeur du
 * champ, comme si elle faisait partie de la liste).
 *
 * - options : tableau de chaînes OU de { valeur, libelle }
 * - optionVide : libellé de l'option vide (ex : "Sélectionner…", "Toutes les villes"). Omis = pas d'option vide.
 * - onChange reçoit directement la valeur (pas l'évènement).
 */
export default function SelectAvecAutre({
  value, onChange, options, optionVide, required = false, disabled = false,
  className = 'champ', placeholderAutre = 'Précisez…',
}) {
  const opts = options.map(o => (typeof o === 'string' ? { valeur: o, libelle: o } : o))
  const dansListe = (v) => opts.some(o => o.valeur === v)
  const [modeAutre, setModeAutre] = useState(!!value && !dansListe(value))

  // Si une valeur hors liste arrive de l'extérieur (profil chargé, URL…),
  // on bascule automatiquement en mode « Autre ».
  useEffect(() => {
    if (value && !dansListe(value)) setModeAutre(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const surChoix = (e) => {
    const v = e.target.value
    if (v === AUTRE) { setModeAutre(true); onChange('') } else { setModeAutre(false); onChange(v) }
  }

  return (
    <>
      <select
        required={required && !modeAutre}
        disabled={disabled}
        className={className}
        value={modeAutre ? AUTRE : (value || '')}
        onChange={surChoix}
      >
        {optionVide !== undefined && <option value="">{optionVide}</option>}
        {opts.map(o => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
        <option value={AUTRE}>Autre (préciser)…</option>
      </select>
      {modeAutre && (
        <input
          type="text"
          required={required}
          disabled={disabled}
          className={`${className} mt-2`}
          placeholder={placeholderAutre}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </>
  )
}
