import { Link } from 'react-router-dom'

const OPTIONS = [
  {
    to: '/inscription/patient',
    titre: 'Je suis patient',
    texte: 'Recherchez un professionnel, prenez rendez-vous et gérez votre dossier médical. Gratuit.',
    accent: 'foret',
  },
  {
    to: '/inscription/professionnel',
    titre: 'Je suis professionnel de santé',
    texte: 'Créez votre espace de gestion et profitez d\'un mois d\'essai gratuit.',
    accent: 'ambre',
  },
  {
    to: '/inscription/laboratoire',
    titre: 'Je suis un laboratoire',
    texte: 'Recevez des demandes d\'analyses de patients et de professionnels. 1 mois d\'essai gratuit.',
    accent: 'ocre',
  },
]

export default function ChoixInscription() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-charbon text-center">Créer un compte</h1>
      <p className="text-ardoise text-center mt-2">Choisissez le type de compte qui vous correspond.</p>

      <div className="grid sm:grid-cols-3 gap-6 mt-10">
        {OPTIONS.map(o => (
          <Link key={o.to} to={o.to} className="carte p-6 hover:border-foret/30">
            <p className={`font-display font-semibold text-lg ${o.accent === 'ambre' ? 'text-ambre' : o.accent === 'ocre' ? 'text-ocre' : 'text-foret'}`}>{o.titre}</p>
            <p className="text-ardoise text-sm mt-2">{o.texte}</p>
            <span className="inline-block mt-4 text-sm font-semibold text-charbon">Continuer →</span>
          </Link>
        ))}
      </div>

      <p className="text-sm text-ardoise text-center mt-8">
        Déjà un compte ? <Link to="/connexion" className="text-foret font-semibold">Se connecter</Link>
      </p>
    </div>
  )
}
