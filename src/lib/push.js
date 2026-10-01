import { Capacitor } from '@capacitor/core'
import { supabase } from './supabaseClient'
import { naviguer } from './navigationRef'

let dejaInitialise = false

/**
 * Demande la permission, récupère le jeton FCM et l'enregistre pour cet
 * utilisateur — à appeler une fois après connexion. Ne fait rien en dehors
 * de l'app Android (web, aperçu navigateur) : le push n'existe que côté
 * natif.
 */
export async function initialiserPush(utilisateurId) {
  if (!Capacitor.isNativePlatform() || !utilisateurId || dejaInitialise) return
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
