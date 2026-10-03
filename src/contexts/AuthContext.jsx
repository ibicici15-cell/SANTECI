import { createContext, useContext, useEffect, useState } from 'react'
import { removePushToken } from '../native/push'
import { supabase } from '../supabaseClient'
import { getAgencyProfile, createAgencyProfile, checkIsAdmin, getTravelerProfile, createTravelerProfile } from '../utils/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [agency, setAgency] = useState(null)
  const [traveler, setTraveler] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Complète automatiquement un profil (agence ou voyageur) resté "en
  // attente" si l'inscription a eu lieu avant confirmation par e-mail
  // (pas de session au moment de l'inscription = pas de droit d'écriture
  // à ce moment-là).
  async function completePendingProfile(currentUser, storageKey, getProfile, createProfile) {
    let profile = await getProfile(currentUser.id)
    if (!profile) {
      const pendingRaw = localStorage.getItem(storageKey)
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw)
        if (pending.email === currentUser.email) {
          await createProfile(currentUser.id, pending)
          localStorage.removeItem(storageKey)
          profile = await getProfile(currentUser.id)
        }
      }
    }
    return profile
  }

  async function loadAgency(currentUser) {
    if (!currentUser) { setAgency(null); return null }
    try {
      const profile = await completePendingProfile(currentUser, 'pendingAgencyProfile', getAgencyProfile, createAgencyProfile)
      setAgency(profile)
      return profile
    } catch {
      setAgency(null)
      return null
    }
  }

  async function loadTraveler(currentUser) {
    if (!currentUser) { setTraveler(null); return null }
    try {
      const profile = await completePendingProfile(currentUser, 'pendingTravelerProfile', getTravelerProfile, createTravelerProfile)
      if (profile?.blocked) {
        await supabase.auth.signOut()
        setTraveler(null)
        return null
      }
      setTraveler(profile)
      return profile
    } catch {
      setTraveler(null)
      return null
    }
  }

  async function loadAdminStatus(currentUser) {
    if (!currentUser) { setIsAdmin(false); return false }
    try {
      const admin = await checkIsAdmin(currentUser.id)
      setIsAdmin(admin)
      return admin
    } catch {
      setIsAdmin(false)
      return false
    }
  }

  async function loadAll(currentUser) {
    const [agencyProfile, travelerProfile, adminStatus] = await Promise.all([
      loadAgency(currentUser),
      loadTraveler(currentUser),
      loadAdminStatus(currentUser),
    ])
    return { agency: agencyProfile, traveler: travelerProfile, isAdmin: adminStatus }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      await loadAll(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      await loadAll(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Renvoie { user, session }. Si "Confirm email" est activé côté Supabase
  // (Authentication → Providers → Email), session sera null tant que le lien
  // reçu par e-mail n'a pas été cliqué — dans ce cas, l'appelant doit
  // attendre la prochaine connexion pour créer le profil (voir loadAgency /
  // loadTraveler ci-dessus).
  //
  // IMPORTANT : si une session existe déjà, on fixe `user` dans le contexte
  // tout de suite. Sans ça, la page appelante crée le profil puis appelle
  // refreshAgency()/refreshTraveler() — qui lisent `user` depuis le contexte
  // via une fermeture (closure) — alors que `user` y était encore `null`
  // (le listener onAuthStateChange n'avait pas encore eu le temps de
  // s'exécuter). Le profil venait bien d'être créé en base, mais
  // refreshTraveler(null) ne le voyait jamais : la page restait bloquée sur
  // "Ton profil se met en place..." indéfiniment.
  async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.session) setUser(data.user)
    return data
  }

  // IMPORTANT : on charge agence/voyageur/admin et on met à jour le
  // contexte AVANT de renvoyer la main à l'appelant (au lieu de compter
  // sur le listener onAuthStateChange, asynchrone et pas toujours résolu
  // au moment où la page appelante fait navigate() juste après login()).
  // Sans ça, une redirection vers une route protégée pouvait s'exécuter
  // avec un contexte encore "vide" et renvoyer vers l'écran de connexion,
  // ou laisser la page de connexion affichée alors que l'utilisateur est
  // bien authentifié.
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
    const extra = await loadAll(data.user)
    return { user: data.user, ...extra }
  }

  async function logout() {
    await removePushToken()
    await supabase.auth.signOut()
    setUser(null)
    setAgency(null)
    setTraveler(null)
    setIsAdmin(false)
  }

  // On relit la session directement depuis Supabase plutôt que de se fier à
  // `user` (état React) : juste après register(), un re-rendu du contexte
  // n'a pas forcément eu le temps de se propager jusqu'à la page appelante
  // avant qu'elle n'appelle refreshAgency()/refreshTraveler(), qui verrait
  // alors encore l'ancienne valeur (null) par fermeture (closure) — d'où le
  // profil qui restait bloqué sur "en attente" malgré sa création réussie.
  async function refreshAgency() {
    const { data: { session } } = await supabase.auth.getSession()
    return loadAgency(session?.user ?? null)
  }

  async function refreshTraveler() {
    const { data: { session } } = await supabase.auth.getSession()
    return loadTraveler(session?.user ?? null)
  }

  return (
    <AuthContext.Provider value={{
      user, agency, traveler, isAdmin, loading,
      register, login, logout, refreshAgency, refreshTraveler,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
