import { Link } from 'react-router-dom'
import { libelleSpecialite, formaterFCFA } from '../lib/constantes'

export default function CarteProfessionnel({ pro }) {
  const initiales = `${pro.prenom?.[0] || ''}${pro.nom?.[0] || ''}`.toUpperCase()

  return (
    <Link to={`/professionnel/${pro.id}`} className="carte p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 group">
      <div className="flex gap-3 sm:gap-4 min-w-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl2 bg-foret-light flex items-center justify-center overflow-hidden shrink-0">
          {pro.photo_url ? (
            <img src={pro.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-foret text-lg">{initiales}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-charbon group-hover:text-foret transition-colors truncate">
            Dr {pro.prenom} {pro.nom}
          </p>
          <p className="text-sm text-ardoise truncate">{libelleSpecialite(pro.specialite)}</p>
          <p className="text-sm text-ardoise mt-0.5 truncate">{pro.ville}, Côte d'Ivoire</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {pro.modes_consultation?.includes('cabinet') && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-foret-light text-foret-dark font-medium">Cabinet</span>
            )}
            {pro.modes_consultation?.includes('teleconsultation') && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-ambre-light text-ambre-dark font-medium">Téléconsultation</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 pt-2 sm:pt-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-ligne">
        <p className="font-donnee font-semibold text-charbon">{formaterFCFA(pro.tarif_consultation)}</p>
        {pro.note_moyenne > 0 && <p className="text-xs text-ocre sm:mt-1">★ {pro.note_moyenne}/5</p>}
      </div>
    </Link>
  )
}
