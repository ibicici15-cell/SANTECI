import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Logo from './Logo'
import Icon from './Icon'
import NotificationBell from './NotificationBell'
import { getTabs, tabMatches, titleFor } from './appTabs'

// Barre du haut façon application : logo sur l'accueil, sinon titre de
// la page ; flèche retour sur les pages secondaires.
export default function AppTopBar() {
  const { user, agency, traveler } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const tabs = getTabs({ user, agency, traveler })
  const isHome = pathname === '/'
  const isRoot = isHome || tabs.some(t => tabMatches(t, pathname))
  const title = titleFor(pathname)

  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper pt-[env(safe-area-inset-top)]">
      <div className="h-14 px-2 flex items-center gap-1">
        {isRoot ? (
          <div className="w-2" />
        ) : (
          <button onClick={goBack} aria-label="Retour" className="tap w-11 h-11 flex items-center justify-center rounded-full">
            <Icon name="back" className="w-6 h-6" />
          </button>
        )}

        {isHome ? (
          <Link to="/" className="flex items-center pl-1"><Logo className="h-9" light /></Link>
        ) : (
          <h1 className="font-display font-semibold text-lg truncate flex-1 min-w-0 pl-1">{title}</h1>
        )}
        {isHome && <div className="flex-1" />}

        <div className="flex items-center">
          {pathname !== '/recherche' && (
            <Link to="/recherche" aria-label="Rechercher" className="tap w-11 h-11 flex items-center justify-center rounded-full">
              <Icon name="search" className="w-6 h-6" />
            </Link>
          )}
          {(traveler || agency) && (
            <div className="w-11 h-11 flex items-center justify-center text-xl"><NotificationBell recipientId={traveler?.id || agency?.id} /></div>
          )}
        </div>
      </div>
    </header>
  )
}
