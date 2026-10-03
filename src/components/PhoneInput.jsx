// Affiche +225 en préfixe fixe ; l'utilisateur ne tape que le reste des
// chiffres, mais value/onChange manipulent toujours le numéro complet
// (ex. "+2250700000000") pour rester cohérent avec ce qui est stocké.
export default function PhoneInput({ value, onChange, required, placeholder = '07 00 00 00 00' }) {
  const rest = value?.startsWith('+225') ? value.slice(4) : (value || '')

  function handleChange(e) {
    const digits = e.target.value.replace(/[^\d\s]/g, '')
    onChange('+225' + digits)
  }

  return (
    <div className="flex items-stretch border border-ink/15 rounded-lg overflow-hidden focus-within:border-ink bg-white">
      <span className="flex items-center px-3 bg-stub text-ink/60 text-sm font-mono">+225</span>
      <input
        required={required}
        type="tel"
        value={rest}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0"
      />
    </div>
  )
}
