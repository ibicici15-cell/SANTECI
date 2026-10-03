// Edge Function : "taches-planifiees"
// Appelée périodiquement (toutes les 15 min recommandé) par pg_cron/pg_net
// (voir supabase/cron.sql) ou par une planification du Dashboard Supabase.
//
// Cette fonction fait deux choses, dans l'ordre :
//  1. Appelle les fonctions SQL de maintenance (définies dans schema.sql) :
//     - creer_rappels_rdv()   → crée une notification "rappel_rdv" pour les
//       rendez-vous confirmés dans les prochaines 24h.
//     - verifier_abonnements() → notifie les pros dont l'essai se termine
//       bientôt, et fait passer les abonnements expirés en statut "expire".
//  2. Envoie réellement, par SMS, toutes les notifications encore marquées
//     sms_envoye = false.
//  3. Envoie aussi les notifications push (Android, via Firebase Cloud
//     Messaging) à tous les appareils enregistrés du destinataire, pour
//     celles encore marquées push_envoye = false.
//
// La passerelle SMS est volontairement générique (HTTP POST configurable).
// Sans SMS_API_URL/SMS_API_KEY configurés, les SMS sont simplement
// journalisés en mode simulation (les notifications restent visibles dans
// l'application de toute façon). Le push est configuré séparément via
// FCM_SERVICE_ACCOUNT_JSON — voir GUIDE_PUSH.md à la racine du projet.
//
// Variables d'environnement requises :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   SMS_API_URL, SMS_API_KEY, SMS_SENDER (optionnelles)
//   FCM_SERVICE_ACCOUNT_JSON (optionnelle — sans elle, le push est ignoré)

import { enTetesCors, reponseJson, clientAdmin } from '../_partages/utils.ts'
import { envoyerPush } from '../_partages/fcm.ts'

async function envoyerSms(telephone: string, message: string) {
  const url = Deno.env.get('SMS_API_URL')
  const cle = Deno.env.get('SMS_API_KEY')
  const expediteur = Deno.env.get('SMS_SENDER') || 'SanteCI'

  if (!url || !cle) {
    console.warn('[taches-planifiees] Passerelle SMS non configurée — SMS simulé pour', telephone, ':', message)
    return { ok: true, simule: true }
  }

  try {
    const reponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
      body: JSON.stringify({ to: telephone, from: expediteur, message }),
    })
    return { ok: reponse.ok }
  } catch (e) {
    console.error('[taches-planifiees] échec envoi SMS', e)
    return { ok: false }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })

  try {
    const admin = clientAdmin()

    const { error: erreurRappels } = await admin.rpc('creer_rappels_rdv')
    if (erreurRappels) console.error('[taches-planifiees] creer_rappels_rdv:', erreurRappels.message)

    const { error: erreurAbonnements } = await admin.rpc('verifier_abonnements')
    if (erreurAbonnements) console.error('[taches-planifiees] verifier_abonnements:', erreurAbonnements.message)

    const { error: erreurCollab } = await admin.rpc('expirer_collaborations')
    if (erreurCollab) console.error('[taches-planifiees] expirer_collaborations:', erreurCollab.message)

    // ---- Notifications push (Android) — traité EN PREMIER pour être rapide ----
    const { data: notifsAPusher, error: erreurPushSelect } = await admin
      .from('notifications')
      .select('id, destinataire_id, titre, contenu, lien')
      .eq('push_envoye', false)
      .order('created_at', { ascending: true })
      .limit(50)

    let pushEnvoyees = 0
    if (erreurPushSelect) {
      console.error('[taches-planifiees] lecture notifications push:', erreurPushSelect.message)
    } else {
      for (const notif of notifsAPusher ?? []) {
        await admin.from('notifications').update({ push_tente_le: new Date().toISOString() }).eq('id', notif.id)

        const { data: jetons } = await admin
          .from('push_tokens')
          .select('token')
          .eq('utilisateur_id', notif.destinataire_id)

        if (!jetons || jetons.length === 0) {
          // Aucun appareil enregistré : rien à envoyer. On clôture la notification
          // pour qu'elle ne bloque pas la file (limite de 50 par passage).
          await admin.from('notifications').update({ push_envoye: true }).eq('id', notif.id)
          continue
        }

        let auMoinsUnEnvoi = false
        for (const j of jetons) {
          const resultat = await envoyerPush(j.token, notif.titre, notif.contenu ?? '', notif.lien ?? undefined)
          if (resultat.ok) auMoinsUnEnvoi = true
          else if (resultat.erreur?.includes('UNREGISTERED') || resultat.erreur?.includes('NOT_FOUND')) {
            // Jeton périmé (app désinstallée, etc.) — on le retire.
            await admin.from('push_tokens').delete().eq('token', j.token)
          } else {
            console.error('[taches-planifiees] échec push', notif.id, resultat.erreur)
          }
        }

        if (auMoinsUnEnvoi) {
          await admin.from('notifications').update({ push_envoye: true }).eq('id', notif.id)
          pushEnvoyees++
        }
      }
    }

    const { data: notifications, error } = await admin
      .from('notifications')
      .select('id, destinataire_id, titre, contenu, lien')
      .eq('sms_envoye', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) return reponseJson({ erreur: error.message }, 500)

    let envoyees = 0
    for (const notif of notifications ?? []) {
      const { data: profil } = await admin
        .from('profiles')
        .select('telephone')
        .eq('id', notif.destinataire_id)
        .maybeSingle()

      await admin.from('notifications').update({ sms_tente_le: new Date().toISOString() }).eq('id', notif.id)

      if (!profil?.telephone) continue

      const message = `Santé-CI — ${notif.titre} : ${notif.contenu ?? ''}`.slice(0, 300)
      const resultat = await envoyerSms(profil.telephone, message)

      if (resultat.ok) {
        await admin.from('notifications').update({ sms_envoye: true }).eq('id', notif.id)
        envoyees++
      }
    }

    return reponseJson({ ok: true, sms_envoyes: envoyees, sms_total: notifications?.length ?? 0, push_envoyes: pushEnvoyees, push_total: notifsAPusher?.length ?? 0 })
  } catch (e) {
    return reponseJson({ erreur: e.message }, 500)
  }
})
