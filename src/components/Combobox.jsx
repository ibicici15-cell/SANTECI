import { useEffect, useRef, useState } from 'react'

// Champ texte libre avec suggestions : l'utilisateur peut cliquer une
// suggestion ou garder son propre texte tapé. Utilisé pour la destination,
// où la liste connue ne doit jamais empêcher de saisir autre chose (les
// agences proposent des destinations qu'on n'a pas forcément prévues).
export default function Combobox({ value, onChange, options, placeholder, className, required }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const query = value || ''
  const filtered = (query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options
  ).slice(0, 8)

  return (
    <div className="relative" ref={containerRef}>
      <input
        required={required}
        value={query}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className || 'input'}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-ink/15 rounded-lg shadow-lg max-h-56 overflow-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false) }}
              className="px-3 py-2 text-sm text-ink hover:bg-stub cursor-pointer"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
