import { Link } from 'react-router-dom'
import Badge from './Badge'
import PointNonLu from './PointNonLu'
import { formaterDate, formaterHeure } from '../lib/constantes'

export default function CarteRendezVous({ rdv, nomAffiche, lienProfil, actions, checkbox, nonLu, onConsulter }) {
  const aReconfirmer = rdv.statut === 'en_attente' && rdv.necessite_reconfirmation

  return (
    <div onClick={onConsulter} className="carte p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {checkbox && <div className="shrink-0">{checkbox}</div>}
      <div className="flex-1 min-w-0">
        {lienProfil ? (
          <Link to={lienProfil} className="font-display font-semibold truncate text-charbon hover:text-foret flex items-center gap-2">
            <PointNonLu actif={nonLu} />{nomAffiche}
          </Link>
        ) : (
          <p className="font-display font-semibold truncate flex items-center gap-2"><PointNonLu actif={nonLu} />{nomAffiche}</p>
        )}
        <p className="text-sm text-ardoise capitalize">{formaterDate(rdv.date_heure)} à {formaterHeure(rdv.date_heure)}</p>
        {rdv.motif && <p className="text-sm text-ardoise mt-1 truncate">Motif : {rdv.motif}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs px-2 py-1 rounded-full bg-charbon/5 font-medium">
          {rdv.mode === 'teleconsultation' ? 'Téléconsultation' : 'Cabinet'}
        </span>
        {aReconfirmer ? (
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-alerte/10 text-alerte">
            À reconfirmer
          </span>
        ) : (
          <Badge statut={rdv.statut} />
        )}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      {rdv.mode === 'teleconsultation' && rdv.statut === 'confirme' && (
        <Link to={`/teleconsultation/${rdv.id}`} className="btn-secondaire !py-2 !px-4 text-sm shrink-0">
          Rejoindre
        </Link>
      )}
    </div>
  )
}
