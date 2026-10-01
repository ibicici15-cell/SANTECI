const STYLES = {
  en_attente: 'bg-ocre/15 text-ocre',
  confirme: 'bg-foret-light text-foret-dark',
  refuse: 'bg-alerte/10 text-alerte',
  annule: 'bg-charbon/8 text-ardoise',
  termine: 'bg-foret-light text-foret-dark',
  non_honore: 'bg-alerte/10 text-alerte',
  essai: 'bg-ocre/15 text-ocre',
  actif: 'bg-foret-light text-foret-dark',
  expire: 'bg-alerte/10 text-alerte',
}

const LIBELLES = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  refuse: 'Refusé',
  annule: 'Annulé',
  termine: 'Terminé',
  non_honore: 'Non honoré',
  essai: 'Essai gratuit',
  actif: 'Abonnement actif',
  expire: 'Abonnement expiré',
}

export default function Badge({ statut }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[statut] || 'bg-charbon/8 text-ardoise'}`}>
      {LIBELLES[statut] || statut}
    </span>
  )
}
