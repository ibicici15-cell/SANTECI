import { Link, useLocation } from 'react-router-dom'
import { Home, Search, FlaskConical, LogIn, Calendar, ClipboardList, MessageSquare, Users, UserCog, CreditCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useNonLusMessagerie from '../hooks/useNonLusMessagerie'

const ONGLETS_PAR_ROLE = {
  visiteur: [
    { to: '/', icone: Home, libelle: 'Accueil' },
    { to: '/recherche', icone: Search, libelle: 'Médecins' },
    { to: '/recherche-laboratoires', icone: FlaskConical, libelle: 'Labos' },
    { to: '/connexion', icone: LogIn, libelle: 'Connexion' },
  ],
  patient: [
    { to: '/patient/tableau-de-bord', icone: Home, libelle: 'Accueil' },
    { to: '/patient/rendez-vous', icone: Calendar, libelle: 'Rendez-vous' },
    { to: '/mes-analyses', icone: FlaskConical, libelle: 'Analyses' },
    { to: '/patient/comptes-rendus', icone: ClipboardList, libelle: 'Comptes-rendus' },
    { to: '/patient/messagerie', icone: MessageSquare, libelle: 'Messagerie', badge: true },
  ],
  professionnel: [
    { to: '/professionnel/tableau-de-bord', icone: Home, libelle: 'Accueil' },
    { to: '/professionnel/rendez-vous', icone: Calendar, libelle: 'Rendez-vous' },
    { to: '/professionnel/collaborations', icone: Users, libelle: 'Collab.' },
    { to: '/professionnel/messagerie', icone: MessageSquare, libelle: 'Messagerie', badge: true },
    { to: '/professionnel/profil', icone: UserCog, libelle: 'Profil' },
  ],
  laboratoire: [
    { to: '/laboratoire/tableau-de-bord', icone: Home, libelle: 'Accueil' },
    { to: '/laboratoire/messagerie', icone: MessageSquare, libelle: 'Messagerie', badge: true },
    { to: '/laboratoire/abonnement', icone: CreditCard, libelle: 'Abonnement' },
    { to: '/laboratoire/profil', icone: UserCog, libelle: 'Profil' },
  ],
}

// Barre d'onglets fixée en bas de l'écran, visible uniquement sur mobile
// (sm:hidden) — pour que la navigation ressemble à une vraie app plutôt
// qu'à un site web réduit : icônes directes vers les sections clés au
// lieu de liens texte enfouis dans un tableau de bord.
export default function NavigationMobile() {
  const { utilisateur, role } = useAuth()
  const location = useLocation()
  const [nonLus] = useNonLusMessagerie(utilisateur, role)

  const cle = utilisateur && ONGLETS_PAR_ROLE[role] ? role : 'visiteur'
  const onglets = ONGLETS_PAR_ROLE[cle]
  if (!onglets) return null

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-fond/95 backdrop-blur border-t border-ligne flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {onglets.map(({ to, icone: Icone, libelle, badge }) => {
        const actif = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
        return (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative ${actif ? 'text-foret' : 'text-ardoise'}`}
          >
            <span className="relative">
              <Icone size={22} strokeWidth={actif ? 2.4 : 2} />
              {badge && nonLus > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-alerte text-white text-[9px] font-bold flex items-center justify-center">
                  {nonLus > 9 ? '9+' : nonLus}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium leading-none">{libelle}</span>
          </Link>
        )
      })}
    </nav>
  )
}
