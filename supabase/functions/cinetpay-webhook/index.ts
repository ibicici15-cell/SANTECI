// Edge Function : "cinetpay-webhook"
//
// ⚠️ NON UTILISÉE dans le parcours actuel (voir cinetpay-initier/index.ts).
// URL appelée directement par les serveurs CinetPay (notify_url) après un
// paiement. Ne fait jamais confiance aux données envoyées par le client :
// revérifie toujours le statut auprès de l'API CinetPay avant de valider.

import { enTetesCors, reponseJson, clientAdmin } from '../_partages/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })

  try {
    const corps = await req.json().catch(() => ({}))
    const transactionId = corps.cpm_trans_id || corps.transaction_id
    if (!transactionId) return reponseJson({ erreur: 'transaction_id manquant.' }, 400)

    const admin = clientAdmin()

    const verif = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: Deno.env.get('CINETPAY_APIKEY'),
        site_id: Deno.env.get('CINETPAY_SITE_ID'),
        transaction_id: transactionId,
      }),
    })
    const resultat = await verif.json()
    const statutCinetPay = resultat?.data?.status

    const { data: paiement } = await admin
      .from('paiements')
      .select('*')
      .eq('reference_transaction', transactionId)
      .maybeSingle()

    if (!paiement) return reponseJson({ erreur: 'Paiement introuvable.' }, 404)

    if (statutCinetPay !== 'ACCEPTED') {
      await admin.from('paiements').update({ statut: 'echoue' }).eq('id', paiement.id)
      return reponseJson({ ok: true, statut: 'echoue' })
    }

    await admin.from('paiements').update({ statut: 'reussi' }).eq('id', paiement.id)

    if (paiement.abonnement_id) {
      const debut = new Date()
      const fin = new Date()
      fin.setMonth(fin.getMonth() + (paiement.plan === 'annuel' ? 12 : 1))

      await admin.from('abonnements').update({
        statut: 'actif',
        plan: paiement.plan,
        date_debut_abonnement: debut.toISOString(),
        date_fin_abonnement: fin.toISOString(),
      }).eq('id', paiement.abonnement_id)

      if (paiement.professionnel_id) {
        await admin.from('professionnels').update({ actif: true }).eq('id', paiement.professionnel_id)
      }
    }

    return reponseJson({ ok: true, statut: 'reussi' })
  } catch (e) {
    return reponseJson({ erreur: e.message }, 500)
  }
})
