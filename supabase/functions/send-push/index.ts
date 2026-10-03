// Edge Function Supabase : envoie une notification push (Firebase Cloud
// Messaging) à chaque nouvelle ligne de la table `notifications`.
//
// Déclenchée par un Database Webhook (INSERT sur public.notifications).
// Secrets requis (Supabase → Edge Functions → Secrets) :
//   FIREBASE_SERVICE_ACCOUNT  -> contenu JSON complet de la clé de compte de service Firebase
//   PUSH_WEBHOOK_SECRET       -> longue chaîne aléatoire, la même que dans le déclencheur SQL
// La vérification JWT de la fonction doit être DÉSACTIVÉE (l'appel est protégé par ce secret) :
// les nouvelles clés publiques Supabase (sb_publishable_...) ne sont pas des JWT et seraient refusées.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.

import { createClient } from 'npm:@supabase/supabase-js@2'

const PUSH_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET')
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const b64url = (input: ArrayBuffer | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let cached: { token: string; exp: number } | null = null

// Jeton OAuth2 Google (valable 1 h, mis en cache) signé avec la clé du compte de service.
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.exp - 60 > now) return cached.token

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const pem = (serviceAccount.private_key as string)
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  const jwt = `${header}.${claims}.${b64url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('Google OAuth: ' + JSON.stringify(json))
  cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) }
  return cached.token
}

Deno.serve(async (req) => {
  if (!PUSH_SECRET || req.headers.get('x-push-secret') !== PUSH_SECRET) {
    console.error('send-push: secret absent ou incorrect')
    return new Response('unauthorized', { status: 401 })
  }
  try {
    const payload = await req.json()
    const n = payload.record
    if (payload.type !== 'INSERT' || !n?.recipient_id) return new Response('ignored')

    const { data: devices } = await supabase
      .from('device_tokens').select('token').eq('user_id', n.recipient_id)
    console.log('send-push', n.type, 'appareils:', devices?.length ?? 0)
    if (!devices?.length) return new Response('no device')

    const accessToken = await getAccessToken()
    const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`

    const results = await Promise.all(devices.map(async ({ token }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: n.title, body: n.message ?? '' },
            // `link` : page à ouvrir quand l'utilisateur touche la notification
            data: { link: n.link ?? '/', type: n.type ?? '', notification_id: n.id ?? '' },
            android: {
              priority: 'HIGH',
              notification: { channel_id: 'default', icon: 'ic_stat_notification', color: '#F77F00' },
            },
          },
        }),
      })
      if (res.ok) return { ok: true }

      const err = await res.json().catch(() => ({}))
      const code = err?.error?.details?.[0]?.errorCode ?? err?.error?.status ?? String(res.status)
      console.error('FCM error', res.status, code, JSON.stringify(err))
      // Seul un jeton définitivement invalide est supprimé (appareil désinstallé).
      // Une autre erreur (ex. message mal formé) ne doit jamais effacer le téléphone.
      if (code === 'UNREGISTERED' || code === 'NOT_FOUND') {
        await supabase.from('device_tokens').delete().eq('token', token)
      }
      return { ok: false, code, detail: err?.error?.message ?? '' }
    }))

    // Le résultat est visible dans Supabase : select content from net._http_response ...
    const summary = {
      sent: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      errors: results.filter(r => !r.ok).map(r => `${(r as any).code}: ${(r as any).detail}`),
    }
    console.log('send-push résultat', JSON.stringify(summary))
    return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
