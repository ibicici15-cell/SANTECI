import { PushNotifications } from '@capacitor/push-notifications'
import { isNative } from './platform'
import { supabase } from '../supabaseClient'

let currentToken = null
let listenersReady = false
let watchdog = null

// État visible dans l'écran Profil, pour comprendre sans outil pourquoi
// les notifications ne sont pas actives sur cet appareil.
// state : idle | registering | ok | denied | error ; message : étape en cours ou détail d'erreur
let status = { state: 'idle', message: '' }
const subscribers = new Set()
function setStatus(next) {
  status = next
  if (next.state !== 'registering') clearTimeout(watchdog)
  subscribers.forEach(fn => fn(status))
}
export function subscribePushStatus(fn) {
  subscribers.add(fn)
  fn(status)
  return () => subscribers.delete(fn)
}

// Indique l'étape en cours (affichée dans la carte du Profil)
function step(label) {
  setStatus({ state: 'registering', message: label })
}

// Une étape qui ne répond jamais ne doit pas laisser « Activation en cours… » indéfiniment
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`délai dépassé (${label})`)), ms)),
  ])
}

// Demande l'autorisation, récupère le jeton FCM de l'appareil et
// l'associe au compte connecté. `onOpen(link)` est appelé quand
// l'utilisateur touche une notification.
export async function initPush({ onOpen }) {
  if (!isNative()) return

  clearTimeout(watchdog)
  step('démarrage')
  watchdog = setTimeout(() => {
    if (status.state === 'registering') {
      setStatus({
        state: 'error',
        message: `Bloqué à l'étape « ${status.message} ». Vérifie google-services.json, la connexion et que l'APK a été recompilé.`,
      })
    }
  }, 30000)

  try {
    if (!listenersReady) {
      step('écoute des événements')
      listenersReady = true

      await PushNotifications.addListener('registration', async ({ value }) => {
        currentToken = value
        step('enregistrement dans Supabase')
        try {
          const { error } = await withTimeout(
            supabase.rpc('register_device_token', { p_token: value, p_platform: 'android' }),
            15000, 'Supabase',
          )
          if (error) setStatus({ state: 'error', message: `Enregistrement refusé par Supabase : ${error.message}` })
          else setStatus({ state: 'ok', message: '' })
        } catch (e) {
          setStatus({ state: 'error', message: `Enregistrement impossible : ${e.message}` })
        }
      })
      await PushNotifications.addListener('registrationError', (e) => {
        setStatus({ state: 'error', message: `Firebase : ${e?.error || e?.message || 'enregistrement impossible'}` })
      })
      // Appli ouverte : la bannière in-app (NotificationToast) prend le relais.
      await PushNotifications.addListener('pushNotificationReceived', () => {})
      // L'utilisateur touche la notification -> on l'amène au bon endroit.
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action?.notification?.data || {}
        // on n'ouvre que des pages de l'app (chemin commençant par « / »)
        if (typeof data.link === 'string' && data.link.startsWith('/')) onOpen?.(data.link, data.notification_id)
      })

      // Canal Android 8+ (doit correspondre à channel_id côté serveur).
      await withTimeout(PushNotifications.createChannel({
        id: 'default', name: 'Notifications', description: 'Demandes, réponses, documents et paiements',
        importance: 4, visibility: 1, vibration: true,
      }), 5000, 'canal').catch(() => {})
    }

    step('autorisation Android')
    let perm = await withTimeout(PushNotifications.checkPermissions(), 10000, 'autorisation')
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      // L'utilisateur a le temps de répondre à la fenêtre Android
      perm = await withTimeout(PushNotifications.requestPermissions(), 90000, 'fenêtre d\'autorisation')
    }
    if (perm.receive !== 'granted') {
      setStatus({ state: 'denied', message: '' })
      return
    }

    step('demande du jeton à Firebase')
    await withTimeout(PushNotifications.register(), 15000, 'Firebase')
  } catch (e) {
    console.warn('Push: init échouée', e)
    setStatus({ state: 'error', message: `${status.message ? `Étape « ${status.message} » : ` : ''}${String(e?.message || e)}` })
  }
}

// À appeler avant la déconnexion : l'appareil ne doit plus recevoir les
// notifications de ce compte.
export async function removePushToken() {
  if (!isNative() || !currentToken) return
  try { await supabase.rpc('unregister_device_token', { p_token: currentToken }) } catch {}
}
