import { Capacitor } from '@capacitor/core'
import { supabase } from './supabaseClient'
import { naviguer } from './navigationRef'

let dejaInitialise = false

// Interrupteur de sécurité : tant que la configuration Firebase
// (google-services.json + plugin Gradle, voir GUIDE_PUSH.md) n'est pas
// faite, le plugin natif peut planter l'app au lancement de
// PushNotifications.register() — un crash natif qu'aucun try/catch
// JavaScript ne peut rattraper. On n'appelle donc JAMAIS le plugin tant
// que ce drapeau n'est pas explicitement activé (VITE_PUSH_ACTIVE=true
// dans .env, après avoir terminé la config Firebase), pour que la
// connexion/inscription ne dépende jamais de ça entre-temps.
const PUSH_ACTIF = import.meta.env.VITE_PUSH_ACTIVE === 'true'

/**
 * Demande la permission, récupère le jeton FCM et l'enregistre pour cet
 * utilisateur — à appeler une fois après connexion. Ne fait rien en dehors
 * de l'app Android (web, aperçu navigateur), ni tant que VITE_PUSH_ACTIVE
 * n'est pas activé.
 */
export async function initialiserPush(utilisateurId) {
  if (!PUSH_ACTIF || !Capacitor.isNativePlatform() || !utilisateurId || dejaInitialise) return
  dejaInitialise = true

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    let permission = await PushNotifications.checkPermissions()
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions()
    }
    if (permission.receive !== 'granted') return

    await PushNotifications.removeAllListeners()

    PushNotifications.addListener('registration', async (jeton) => {
      await supabase.from('push_tokens').upsert(
        { utilisateur_id: utilisateurId, token: jeton.value, plateforme: 'android' },
        { onConflict: 'utilisateur_id,token' }
      )
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Erreur d\'enregistrement push :', err)
    })

    // L'utilisateur tape sur la notification (app en arrière-plan ou fermée)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const lien = action.notification?.data?.lien
      if (lien) naviguer(lien)
    })

    await PushNotifications.register()
  } catch (e) {
    console.error('Push notifications indisponibles :', e)
  }
}

/** À appeler à la déconnexion pour ne plus recevoir de push destinés à ce compte. */
export async function desactiverPush(utilisateurId) {
  if (!utilisateurId) return
  await supabase.from('push_tokens').delete().eq('utilisateur_id', utilisateurId)
  dejaInitialise = false // permet un nouvel enregistrement si un autre compte se connecte sur cet appareil
}
