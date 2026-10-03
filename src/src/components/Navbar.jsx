import { Link, useNavigate } from 'react-router-dom'
import { Stethoscope, MessageSquare, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import CentreNotifications from './CentreNotifications'
import useNonLusMessagerie from '../hooks/useNonLusMessagerie'

const tableauDeBordParRole = {
  patient: '/patient/tableau-de-bord',
  professionnel: '/professionnel/tableau-de-bord',
  etablissement: '/etablissement/tableau-de-bord',
  laboratoire: '/laboratoire/tableau-de-bord',
  admin: '/admin/tableau-de-bord',
}

const messagerieParRole = {
  patient: '/patient/messagerie',
  professionnel: '/professionnel/messagerie',
  laboratoire: '/laboratoire/messagerie',
}

export default function Navbar() {
  const { utilisateur, role, deconnexion, detail } = useAuth()
  const navigate = useNavigate()
  const [nonLus] = useNonLusMessagerie(utilisateur, role)

  const seDeconnecter = async () => {
    await deconnexion()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-fond/90 backdrop-blur border-b border-ligne">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-lg text-charbon">
          <span className="w-8 h-8 rounded-lg bg-foret flex items-center justify-center text-white">
            <Stethoscope size={18} />
          </span>
          Santé<span className="text-ambre">-CI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ardoise">
          {(!utilisateur || role === 'patient') && (
            <>
              <Link to="/recherche" className="hover:text-charbon">Trouver un professionnel</Link>
              <Link to="/recherche-laboratoires" className="hover:text-charbon">Trouver un laboratoire</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!utilisateur && (
            <>
              <Link to="/connexion" className="hidden sm:inline-flex btn-fantome !px-4 !py-2 text-sm">Connexion</Link>
              <Link to="/inscription" className="hidden sm:inline-flex btn-primaire !px-4 !py-2 text-sm">Créer un compte</Link>
            </>
          )}
          {utilisateur && (
            <>
              <CentreNotifications />
              {messagerieParRole[role] && (
                <Link to={messagerieParRole[role]} className="hidden sm:flex relative w-9 h-9 rounded-full items-center justify-center text-ardoise hover:text-foret hover:bg-charbon/5">
                  <MessageSquare size={19} />
                  {nonLus > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-alerte text-white text-[10px] font-bold flex items-center justify-center">
                      {nonLus > 9 ? '9+' : nonLus}
                    </span>
                  )}
                </Link>
              )}
              <span className="hidden sm:inline text-sm text-ardoise">
                {detail?.prenom ? `Bonjour, ${detail.prenom}` : utilisateur.email}
              </span>
              <Link to={tableauDeBordParRole[role] || '/'} className="hidden sm:inline-flex btn-secondaire !px-4 !py-2 text-sm">
                Tableau de bord
              </Link>
              <button onClick={seDeconnecter} aria-label="Déconnexion" className="btn-fantome !px-3 sm:!px-4 !py-2 text-sm flex items-center gap-1.5">
                <LogOut size={17} className="sm:hidden" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
