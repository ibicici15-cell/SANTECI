import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isNative } from './platform'
import { initPush } from './push'
import { markNotificationRead } from '../utils/db'

const TAB_ROOTS = ['/favoris', '/mes-demandes', '/mon-casier', '/compte', '/recherche',
  '/agence/tableau-de-bord', '/agence/demandes', '/agence/abonnement']

// Branche l'app sur le téléphone : barre d'état, écran de démarrage,
// bouton retour Android et notifications push.
export default function NativeBridge() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  useEffect(() => {
    if (!isNative()) return
    ;(async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#201D19' }).catch(() => {})
      } catch {}
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch {}
    })()
  }, [])

  // Bouton retour Android : retour -> accueil -> quitter (comme une vraie app).
  useEffect(() => {
    if (!isNative()) return
    let handle
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        const p = pathRef.current
        if (p === '/') { App.exitApp(); return }
        if (TAB_ROOTS.includes(p)) { navigate('/', { replace: true }); return }
        if (window.history.state?.idx > 0) navigate(-1)
        else navigate('/', { replace: true })
      }).then(h => { handle = h })
    })
    return () => { handle?.remove() }
  }, [])

  // Notifications push : activées dès qu'un compte est connecté.
  useEffect(() => {
    if (user?.id) initPush({
      onOpen: (link, notificationId) => {
        if (notificationId) markNotificationRead(notificationId).catch(() => {})
        navigate(link)
      },
    })
  }, [user?.id])

  return null
}
