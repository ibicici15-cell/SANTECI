import { useEffect, useRef } from 'react'

// Message d'erreur / de succès de formulaire : s'affiche au centre de
// l'écran dès qu'il apparaît, pour ne jamais rester hors de vue (clavier
// ouvert, petit écran).
export default function FormAlert({ kind = 'error', className = '', children }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [children])

  const styles = kind === 'success'
    ? 'bg-green/10 border-green/30 text-green'
    : 'bg-red-50 border-red-200 text-red-700'
  return (
    <div ref={ref} role={kind === 'error' ? 'alert' : 'status'} className={`border rounded-xl px-3 py-2.5 text-sm ${styles} ${className}`}>
      {children}
    </div>
  )
}
