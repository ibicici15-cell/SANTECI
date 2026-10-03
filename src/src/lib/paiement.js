import { supabase } from './supabaseClient'

/**
 * Appelle l'Edge Function "cinetpay-initier" et redirige l'utilisateur vers la page
 * de paiement CinetPay (carte bancaire, Orange Money, MTN MoMo, Moov Money, Wave...).
 *
 * NOTE : cette fonction n'est PAS utilisée dans le parcours actuel de
 * l'application (le paiement de l'abonnement se fait par transfert Mobile
 * Money manuel, vérifié par un administrateur — voir
 * AbonnementProfessionnel.jsx). Elle est conservée ici, ainsi que les Edge
 * Functions correspondantes (supabase/functions/cinetpay-*), au cas où vous
 * souhaiteriez activer un paiement automatique plus tard.
 */
export async function initierPaiement({ type_paiement, montant, telephone, plan, abonnement_id, rendez_vous_id, professionnel_id }) {
  const { data, error } = await supabase.functions.invoke('cinetpay-initier', {
    body: { type_paiement, montant, telephone, plan, abonnement_id, rendez_vous_id, professionnel_id },
  })
  if (error) throw error
  if (data?.erreur) throw new Error(data.erreur)

  window.location.href = data.url_paiement
}
