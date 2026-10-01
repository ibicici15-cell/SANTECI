import { Link } from 'react-router-dom'

export default function PageIntrouvable() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="font-display text-5xl font-extrabold text-foret">404</p>
      <p className="text-ardoise mt-3">Cette page n'existe pas ou plus.</p>
      <Link to="/" className="btn-primaire mt-6 inline-flex">Retour à l'accueil</Link>
    </div>
  )
}
