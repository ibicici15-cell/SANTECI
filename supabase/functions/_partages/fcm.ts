// Envoi de notifications push via l'API FCM HTTP v1 (celle qui remplace
// l'ancienne API "legacy" désormais fermée par Google). Nécessite un
// compte de service Firebase (JSON), fourni via la variable d'environnement
// FCM_SERVICE_ACCOUNT_JSON (le contenu du fichier JSON tel quel, en une
// seule ligne) — voir GUIDE_PUSH.md pour l'obtenir.
//
// L'API v1 s'authentifie avec un jeton OAuth2, obtenu en signant un JWT
// avec la clé privée du compte de service (RS256) puis en l'échangeant
// contre un access_token auprès de Google. Tout est fait ici avec le
// Web Crypto natif de Deno, sans dépendance externe.

interface CompteService {
  client_email: string
  private_key: string
  project_id: string
}

function base64Url(donnees: ArrayBuffer | string): string {
  const octets = typeof donnees === 'string' ? new TextEncoder().encode(donnees) : new Uint8Array(donnees)
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemVersArrayBuffer(pem: string): ArrayBuffer {
  const corps = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binaire = atob(corps)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets.buffer
}

let jetonCache: { valeur: string; expire: number } | null = null

async function obtenirJetonAcces(compte: CompteService): Promise<string> {
  if (jetonCache && jetonCache.expire > Date.now() + 30_000) return jetonCache.valeur

  const maintenant = Math.floor(Date.now() / 1000)
  const entete = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const revendications = base64Url(JSON.stringify({
    iss: compte.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: maintenant,
    exp: maintenant + 3600,
  }))
  const aSigner = `${entete}.${revendications}`

  const cle = await crypto.subtle.importKey(
    'pkcs8',
    pemVersArrayBuffer(compte.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cle, new TextEncoder().encode(aSigner))
  const jwt = `${aSigner}.${base64Url(signature)}`

  const reponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const donnees = await reponse.json()
  if (!reponse.ok) throw new Error(`Échec OAuth2 FCM : ${JSON.stringify(donnees)}`)

  jetonCache = { valeur: donnees.access_token, expire: Date.now() + donnees.expires_in * 1000 }
  return donnees.access_token
}

export async function envoyerPush(
  token: string,
  titre: string,
  contenu: string,
  lien?: string
): Promise<{ ok: boolean; erreur?: string }> {
  const brut = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
  if (!brut) return { ok: false, erreur: 'FCM_SERVICE_ACCOUNT_JSON non configuré' }

  let compte: CompteService
  try {
    compte = JSON.parse(brut)
  } catch {
    return { ok: false, erreur: 'FCM_SERVICE_ACCOUNT_JSON invalide (JSON mal formé)' }
  }

  try {
    const jeton = await obtenirJetonAcces(compte)
    const reponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${compte.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: titre, body: contenu ?? '' },
            data: lien ? { lien } : {},
            android: { priority: 'high' },
          },
        }),
      }
    )
    const resultat = await reponse.json()
    if (!reponse.ok) return { ok: false, erreur: JSON.stringify(resultat) }
    return { ok: true }
  } catch (e) {
    return { ok: false, erreur: String(e) }
  }
}
