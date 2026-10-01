export default function Footer() {
  return (
    <footer className="hidden sm:block mt-24 border-t border-ligne bg-surface">
      <div className="h-1.5 motif-tisse" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="font-display font-extrabold text-charbon mb-2">Santé<span className="text-ambre">-CI</span></p>
          <p className="text-ardoise">
            La plateforme numérique qui simplifie l'accès aux soins en Côte d'Ivoire —
            en cabinet ou en téléconsultation.
          </p>
        </div>
        <div>
          <p className="font-semibold text-charbon mb-2">Patients</p>
          <ul className="space-y-1.5 text-ardoise">
            <li>Inscription gratuite</li>
            <li>Rechercher un professionnel</li>
            <li>Prendre rendez-vous</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-charbon mb-2">Professionnels</p>
          <ul className="space-y-1.5 text-ardoise">
            <li>1 mois d'essai gratuit</li>
            <li>Aucune commission sur les consultations</li>
            <li>Gestion complète de votre activité</li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-ardoise pb-6">
        © {new Date().getFullYear()} Santé-CI. Plateforme d'intermédiation technologique — ne fournit pas de soins médicaux.
      </div>
    </footer>
  )
}
