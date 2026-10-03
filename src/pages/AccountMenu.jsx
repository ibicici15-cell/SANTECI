import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isNative } from '../native/platform'
import { subscribePushStatus, initPush } from '../native/push'
import { useAuth } from '../contexts/AuthContext'
import useNavCounts from '../utils/useNavCounts'
import Icon from '../components/Icon'

function Row({ to, icon, label, badge, onClick, danger }) {
  const cls = `tap w-full flex items-center gap-3 px-4 py-3.5 text-left ${danger ? 'text-red-600' : 'text-ink'}`
  const content = (
    <>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-stub'}`}>
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {badge > 0 && <span className="min-w-[1.4rem] h-6 px-1.5 rounded-full bg-orange text-ink text-xs font-bold flex items-center justify-center">{badge}</span>}
      {!danger && <Icon name="chevron" className="w-5 h-5 text-ink/30" />}
    </>
  )
  return to
    ? <Link to={to} className={cls}>{content}</Link>
    : <button onClick={onClick} className={cls}>{content}</button>
}

function Card({ children }) {
  return <div className="bg-white border border-ink/10 rounded-2xl divide-y divide-ink/10 overflow-hidden">{children}</div>
}

// Carte d'état des notifications push (APK uniquement).
function PushStatusCard() {
  const navigate = useNavigate()
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  useEffect(() => subscribePushStatus(setStatus), [])

  const texts = {
    idle: 'Pas encore activées sur cet appareil.',
    registering: status.message ? `Activation en cours… (${status.message})` : 'Activation en cours…',
    ok: 'Activées sur cet appareil ✓',
    denied: 'Refusées. Active-les dans Paramètres Android → Applications → Agnini Sanfè → Notifications.',
    error: status.message,
  }
  const ok = status.state === 'ok'
  return (
    <div className="bg-white border border-ink/10 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${ok ? 'bg-green/15 text-green' : 'bg-stub'}`}>
          <Icon name="bell" className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Notifications push</div>
          <div className={`text-sm break-words ${status.state === 'error' || status.state === 'denied' ? 'text-red-600' : 'text-ink/60'}`}>{texts[status.state]}</div>
        </div>
      </div>
      {!ok && status.state !== 'registering' && (
        <button onClick={() => initPush({ onOpen: (link) => navigate(link) })} className="btn-outline w-full mt-3 !py-2.5 text-sm">
          Réessayer l'activation
        </button>
      )}
    </div>
  )
}

// Écran "Profil / Compte" : point d'entrée de l'onglet du même nom dans
// l'application. Remplace le footer et le menu du site web.
export default function AccountMenu() {
  const { user, agency, traveler, isAdmin, logout } = useAuth()
  const { favCount, reqCount, docCount, agencyNewCount } = useNavCounts()
  const navigate = useNavigate()

  const name = agency?.name || traveler?.name || user?.email || ''
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {user ? (
        <div className="flex items-center gap-4 bg-ink text-paper rounded-2xl p-4">
          <div className="w-14 h-14 rounded-full bg-orange text-ink font-display font-bold text-2xl flex items-center justify-center shrink-0">{initial}</div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-lg truncate">{name}</div>
            <div className="text-paper/60 text-xs truncate">{user.email}</div>
            <div className="text-xs mt-1 text-green-300">{agency ? 'Compte agence' : 'Compte voyageur'}</div>
          </div>
        </div>
      ) : (
        <div className="bg-ink text-paper rounded-2xl p-5">
          <div className="font-display font-bold text-xl">Bienvenue à bord</div>
          <p className="text-paper/70 text-sm mt-1">Connecte-toi pour enregistrer des favoris, suivre tes demandes et garder tes documents.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/compte/connexion" className="btn-outline !border-paper/30 !text-paper !py-3">Connexion</Link>
            <Link to="/compte/inscription" className="btn-primary !py-3">Créer un compte</Link>
          </div>
          <p className="text-paper/60 text-sm mt-4">Tu es une agence de voyages ?</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link to="/agence/connexion" className="btn-outline !border-paper/30 !text-paper !py-2.5 text-sm">Espace agence</Link>
            <Link to="/agence/inscription" className="btn-outline !border-paper/30 !text-paper !py-2.5 text-sm">Inscrire mon agence</Link>
          </div>
        </div>
      )}

      {traveler && (
        <Card>
          <Row to="/profil" icon="user" label="Mon profil" />
          <Row to="/favoris" icon="heart" label="Mes favoris" badge={favCount} />
          <Row to="/mes-demandes" icon="chat" label="Mes messages" badge={reqCount} />
          <Row to="/mon-casier" icon="folder" label="Mon casier" badge={docCount} />
        </Card>
      )}

      {agency && (
        <Card>
          <Row to="/agence/tableau-de-bord" icon="grid" label="Mes annonces" />
          <Row to="/agence/annonces/nouvelle" icon="plus" label="Publier une annonce" />
          <Row to="/agence/demandes" icon="inbox" label="Demandes reçues" badge={agencyNewCount} />
          <Row to="/agence/abonnement" icon="card" label="Abonnement et boosts" />
        </Card>
      )}

      {user && isNative() && <PushStatusCard />}

      {isAdmin && (
        <Card><Row to="/admin" icon="shield" label="Administration" /></Card>
      )}

      <Card>
        <Row to="/contact" icon="mail" label="Nous contacter" />
        <Row to="/regles-publication" icon="file" label="Règles de publication" />
      </Card>

      {user && (
        <Card><Row icon="logout" label="Déconnexion" onClick={handleLogout} danger /></Card>
      )}

      <p className="text-xs text-ink/55 text-center px-2 pt-2">
        Agnini Sanfè met en relation voyageurs et agences de voyages. Nous n'intervenons pas
        dans les réservations, paiements ou litiges liés aux offres publiées par les agences.
      </p>
      <p className="text-xs text-ink/40 text-center">© {new Date().getFullYear()} Agnini Sanfè</p>
    </div>
  )
}
