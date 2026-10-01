import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { desactiverPush } from '../lib/push'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // ligne de la table profiles
  const [detail, setDetail] = useState(null)   // ligne patients / professionnels / etablissements
  const [loading, setLoading] = useState(true)

  const chargerProfil = useCallback(async (userId) => {
    if (!userId) { setProfile(null); setDetail(null); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(prof || null)

    if (prof?.role === 'patient') {
      const { data } = await supabase.from('patients').select('*').eq('id', userId).maybeSingle()
      setDetail(data || null)
    } else if (prof?.role === 'professionnel') {
      const { data } = await supabase.from('professionnels').select('*').eq('id', userId).maybeSingle()
      setDetail(data || null)
    } else if (prof?.role === 'etablissement') {
      const { data } = await supabase.from('etablissements').select('*').eq('id', userId).maybeSingle()
      setDetail(data || null)
    } else if (prof?.role === 'laboratoire') {
      const { data } = await supabase.from('laboratoires').select('*').eq('id', userId).maybeSingle()
      setDetail(data || null)
    } else {
      setDetail(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      chargerProfil(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      chargerProfil(session?.user?.id)
    })

    return () => subscription.unsubscribe()
  }, [chargerProfil])

  const deconnexion = async () => {
    const idAvant = session?.user?.id
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setDetail(null)
    if (idAvant) desactiverPush(idAvant)
  }

  const rafraichirProfil = () => chargerProfil(session?.user?.id)

  // À appeler (et attendre) juste avant une navigation qui dépend du rôle
  // (ex : juste après la connexion ou l'inscription), pour éviter que la
  // redirection ne s'exécute avant que le contexte n'ait fini de se
  // synchroniser.
  const synchroniserSession = useCallback(async () => {
    const { data: { session: sessionActuelle } } = await supabase.auth.getSession()
    setSession(sessionActuelle)
    await chargerProfil(sessionActuelle?.user?.id)
    return sessionActuelle
  }, [chargerProfil])

  const value = {
    session,
    utilisateur: session?.user || null,
    profile,
    detail,
    role: profile?.role || null,
    loading,
    deconnexion,
    rafraichirProfil,
    synchroniserSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>')
  return ctx
}
