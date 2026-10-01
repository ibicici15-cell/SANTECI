// Edge Function : "cinetpay-initier"
//
// ⚠️ NON UTILISÉE dans le parcours actuel de l'application. Le paiement de
// l'abonnement professionnel se fait par transfert Mobile Money manuel,
// déclaré par le professionnel et vérifié par un administrateur (voir
// AbonnementProfessionnel.jsx et TableauDeBordAdmin.jsx). Cette fonction
// est conservée si vous souhaitez activer un paiement automatique via
// CinetPay plus tard (carte bancaire, Orange Money, MTN MoMo, Wave...).
//
// Documentation CinetPay (vérifiez la version en vigueur avant mise en
// production, l'API peut évoluer) : https://docs.cinetpay.com

import { enTetesCors, reponseJson, clientAdmin, utilisateurConnecte } from '../_partages/utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })

  try {
    const utilisateur = await utilisateurConnecte(req)
    if (!utilisateur) return reponseJson({ erreur: 'Non authentifié.' }, 401)

    const corps = await req.json()
    const { montant, telephone, plan, abonnement_id } = corps

    if (!montant || montant <= 0) return reponseJson({ erreur: 'Montant invalide.' }, 400)

    const admin = clientAdmin()
    const transactionId = `sci_abonnement_${crypto.randomUUID()}`

    const { data: paiement, error: erreurPaiement } = await admin.from('paiements').insert({
      type_paiement: 'abonnement',
      abonnement_id,
      professionnel_id: utilisateur.id,
      montant,
      moyen_paiement: 'cinetpay',
      statut: 'en_attente',
      reference_transaction: transactionId,
      plan,
    }).select().single()

    if (erreurPaiement) return reponseJson({ erreur: erreurPaiement.message }, 500)

    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173'

    const reponseCinetPay = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: Deno.env.get('CINETPAY_APIKEY'),
        site_id: Deno.env.get('CINETPAY_SITE_ID'),
        transaction_id: transactionId,
        amount: montant,
        currency: 'XOF',
        description: `Abonnement Santé-CI (${plan || 'mensuel'})`,
        customer_phone_number: telephone || '',
        notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-webhook`,
        return_url: `${appUrl}/professionnel/abonnement`,
        channels: 'ALL',
        metadata: paiement.id,
      }),
    })

    const resultat = await reponseCinetPay.json()

    if (resultat.code !== '201') {
      await admin.from('paiements').update({ statut: 'echoue' }).eq('id', paiement.id)
      return reponseJson({ erreur: resultat.message || 'Échec de l\'initialisation CinetPay.' }, 502)
    }

    return reponseJson({ url_paiement: resultat.data.payment_url, transaction_id: transactionId })
  } catch (e) {
    return reponseJson({ erreur: e.message }, 500)
  }
})
