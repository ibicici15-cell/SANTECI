import { supabase } from '../supabaseClient'

// ---------- Mappage snake_case (Postgres) -> camelCase (UI) ----------

function toListing(row) {
  if (!row) return null
  return {
    id: row.id,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    agencyVerified: row.agency_verified,
    title: row.title,
    offerType: row.offer_type,
    destinationCountry: row.destination_country,
    destinationCity: row.destination_city,
    departureCity: row.departure_city,
    price: row.price,
    durationDays: row.duration_days,
    departureDate: row.departure_date,
    availableSeats: row.available_seats,
    type: row.type,
    description: row.description,
    program: row.program,
    servicesIncluded: row.services_included || [],
    photos: row.photos || [],
    status: row.status,
    boosted: Boolean(row.boosted) && (!row.boost_expires_at || new Date(row.boost_expires_at) > new Date()),
    boostSource: row.boost_source,
    boostExpiresAt: row.boost_expires_at,
    views: row.views,
    clicks: row.clicks,
    createdAt: row.created_at,
  }
}

function fromListingInput(listing) {
  return {
    title: listing.title,
    offer_type: listing.offerType,
    destination_country: listing.destinationCountry,
    destination_city: listing.destinationCity,
    departure_city: listing.departureCity,
    price: listing.price,
    duration_days: listing.durationDays,
    departure_date: listing.departureDate,
    available_seats: listing.availableSeats,
    type: listing.type,
    description: listing.description,
    program: listing.program,
    services_included: listing.servicesIncluded || [],
    photos: listing.photos || [],
    agency_name: listing.agencyName,
    agency_verified: listing.agencyVerified,
  }
}

function toAgency(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    city: row.city,
    openingHours: row.opening_hours,
    acceptedPaymentMethods: row.accepted_payment_methods || [],
    acceptedPublishingRules: row.accepted_publishing_rules,
    publishingRulesAcceptedAt: row.publishing_rules_accepted_at,
    welcomeMessageSeen: row.welcome_message_seen,
    verified: row.verified,
    plan: row.plan,
    planStartedAt: row.plan_started_at,
    suspended: row.suspended,
    listingsCount: row.listings_count,
    ratingAvg: row.rating_avg,
    reviewCount: row.review_count,
    createdAt: row.created_at,
  }
}

function toRequest(row) {
  if (!row) return null
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    agencyId: row.agency_id,
    travelerId: row.traveler_id,
    travelerName: row.traveler_name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    travelersCount: row.travelers_count,
    desiredDate: row.desired_date,
    message: row.message,
    paymentReference: row.payment_reference,
    documents: row.documents || [],
    agencyReply: row.agency_reply,
    repliedAt: row.replied_at,
    status: row.status,
    createdAt: row.created_at,
  }
}

function toTraveler(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    city: row.city,
    blocked: row.blocked,
    createdAt: row.created_at,
  }
}

// ---------- Agences ----------

export async function createAgencyProfile(uid, data) {
  const { error } = await supabase.from('agencies').insert({
    id: uid,
    name: data.name,
    email: data.email,
    phone: data.phone,
    whatsapp: data.whatsapp,
    city: data.city,
    accepted_publishing_rules: data.accepted_publishing_rules || false,
    publishing_rules_accepted_at: data.publishing_rules_accepted_at || null,
  })
  if (error) throw error
}

export async function getAgencyProfile(agencyId) {
  const { data, error } = await supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle()
  if (error) throw error
  return toAgency(data)
}

export async function updateAgencyProfile(agencyId, data) {
  const { error } = await supabase.from('agencies').update(data).eq('id', agencyId)
  if (error) throw error
}

export async function fetchTravelerReviews(travelerId) {
  const { data, error } = await supabase.from('reviews').select('*').eq('traveler_id', travelerId)
  if (error) throw error
  return data
}

// Les limites de plan sont désormais définies dans src/data/plans.js
// (PLANS) et le quota réel est calculé côté serveur, au mois en cours —
// voir check_listing_quota() dans supabase/schema.sql.

// ---------- Annonces ----------
// Le quota mensuel (5 gratuites + allocation du plan) est vérifié une seconde fois
// côté serveur par un trigger Postgres (voir supabase/schema.sql) : même si le
// front est contourné, l'insertion est bloquée en base.

export async function createListing(agencyId, listing) {
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...fromListingInput(listing), agency_id: agencyId, status: 'active' })
    .select()
    .single()

  if (error) {
    if (error.message?.includes('QUOTA_EXCEEDED')) {
      const err = new Error('QUOTA_EXCEEDED')
      err.code = 'QUOTA_EXCEEDED'
      throw err
    }
    throw error
  }
  return data.id
}

export async function updateListing(listingId, data) {
  const { error } = await supabase.from('listings').update(fromListingInput(data)).eq('id', listingId)
  if (error) throw error
}

export async function deleteListing(listingId) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  if (error) throw error
}

export async function setListingStatus(listingId, status) {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId)
  if (error) throw error
}

export async function getListingById(listingId) {
  const { data, error } = await supabase.from('listings').select('*').eq('id', listingId).maybeSingle()
  if (error) throw error
  return toListing(data)
}

export async function incrementListingViews(listingId) {
  try { await supabase.rpc('increment_listing_views', { listing_id: listingId }) } catch { /* silencieux */ }
}

export async function incrementListingClicks(listingId) {
  try { await supabase.rpc('increment_listing_clicks', { listing_id: listingId }) } catch { /* silencieux */ }
}

// Recherche avec filtres combinés — c'est ici que Postgres brille par rapport
// à Firestore : on peut enchaîner plusieurs filtres de type "plage" en une
// seule requête (prix min/max, durée min/max, etc.) sans post-traitement.
export async function fetchActiveListings({
  destination, departureCity, type, offerType, priceMin, priceMax, durationMin, durationMax, dateDepart, sortBy,
} = {}) {
  let q = supabase.from('listings').select('*').eq('status', 'active')

  // Recherche insensible à la casse et partielle : la destination est
  // maintenant en saisie libre (le monde entier), donc "dubai" doit
  // retrouver "Dubaï" même sans accent ni majuscule exacte.
  if (destination) q = q.ilike('destination_country', `%${destination}%`)
  if (departureCity) q = q.eq('departure_city', departureCity)
  if (type) q = q.eq('type', type)
  if (offerType) q = q.eq('offer_type', offerType)
  if (priceMin) q = q.gte('price', Number(priceMin))
  if (priceMax) q = q.lte('price', Number(priceMax))
  if (durationMin) q = q.gte('duration_days', Number(durationMin))
  if (durationMax) q = q.lte('duration_days', Number(durationMax))
  if (dateDepart) q = q.gte('departure_date', dateDepart)

  if (sortBy === 'prix_asc') q = q.order('price', { ascending: true })
  else if (sortBy === 'prix_desc') q = q.order('price', { ascending: false })
  else if (sortBy === 'populaire') q = q.order('views', { ascending: false })
  else q = q.order('boosted', { ascending: false }).order('created_at', { ascending: false })

  const { data, error } = await q.limit(60)
  if (error) throw error
  return data.map(toListing)
}

export async function fetchFeaturedListings() {
  const { data, error } = await supabase
    .from('listings').select('*').eq('status', 'active')
    .order('created_at', { ascending: false }).limit(8)
  if (error) throw error
  return data.map(toListing)
}

export async function fetchAgencyListings(agencyId) {
  const { data, error } = await supabase
    .from('listings').select('*').eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toListing)
}

// ---------- Messagerie (discussion illimitée) ----------

function toChatMessage(row) {
  return {
    id: row.id, requestId: row.request_id, senderRole: row.sender_role,
    senderId: row.sender_id, body: row.body, createdAt: row.created_at,
  }
}

export async function fetchChatMessages(requestIds) {
  if (!requestIds.length) return []
  const { data, error } = await supabase
    .from('request_messages').select('*').in('request_id', requestIds)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(toChatMessage)
}

export async function sendChatMessage(requestId, role, senderId, body) {
  const { data, error } = await supabase
    .from('request_messages')
    .insert({ request_id: requestId, sender_role: role, sender_id: senderId, body })
    .select().single()
  if (error) throw error
  return toChatMessage(data)
}

// Reçoit en direct les nouveaux messages des conversations de l'utilisateur
// (la sécurité par lignes limite déjà ce qu'il peut voir).
export function subscribeToChatMessages(onInsert) {
  const channel = supabase
    .channel(`chat:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'request_messages' },
      (payload) => onInsert(toChatMessage(payload.new)))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ---------- Demandes de contact ----------

export async function createContactRequest(data) {
  const { error } = await supabase.from('requests').insert({
    listing_id: data.listingId,
    listing_title: data.listingTitle,
    agency_id: data.agencyId,
    traveler_id: data.travelerId || null,
    traveler_name: data.travelerName,
    phone: data.phone,
    whatsapp: data.whatsapp,
    travelers_count: data.travelersCount,
    desired_date: data.desiredDate || null,
    message: data.message,
    payment_reference: data.paymentReference || null,
  })
  if (error) throw error
}

export async function fetchAgencyRequests(agencyId) {
  const { data, error } = await supabase
    .from('requests').select('*').eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toRequest)
}

// Comptage exact côté serveur (plus fiable que filtrer une liste déjà
// récupérée, notamment si la page affiche des données mises à jour
// localement entre deux rechargements).
export async function fetchAgencyNewRequestsCount(agencyId) {
  const { count, error } = await supabase
    .from('requests').select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId).eq('status', 'new')
  if (error) throw error
  return count || 0
}

export async function markRequestStatus(requestId, status) {
  const { error } = await supabase.from('requests').update({ status }).eq('id', requestId)
  if (error) throw error
}

export async function replyToRequest(requestId, replyText) {
  const { error } = await supabase.from('requests').update({
    agency_reply: replyText,
    replied_at: new Date().toISOString(),
    status: 'read',
  }).eq('id', requestId)
  if (error) throw error
}

export async function fetchTravelerRequests(travelerId) {
  const { data, error } = await supabase
    .from('requests').select('*').eq('traveler_id', travelerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toRequest)
}

// ============================================================
// Voyageurs
// ============================================================

export async function createTravelerProfile(uid, data) {
  const { error } = await supabase.from('travelers').insert({
    id: uid, name: data.name, phone: data.phone, whatsapp: data.whatsapp, city: data.city,
  })
  if (error) throw error
}

export async function getTravelerProfile(travelerId) {
  const { data, error } = await supabase.from('travelers').select('*').eq('id', travelerId).maybeSingle()
  if (error) throw error
  return toTraveler(data)
}

export async function updateTravelerProfile(travelerId, data) {
  const { error } = await supabase.from('travelers').update({
    name: data.name, phone: data.phone, whatsapp: data.whatsapp, city: data.city,
  }).eq('id', travelerId)
  if (error) throw error
}

// ============================================================
// Favoris
// ============================================================

export async function fetchFavorites(travelerId, targetType) {
  let q = supabase.from('favorites').select('*').eq('traveler_id', travelerId)
  if (targetType) q = q.eq('target_type', targetType)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data.map(f => ({
    id: f.id, targetType: f.target_type, targetId: f.target_id,
    targetLabel: f.target_label, createdAt: f.created_at,
  }))
}

// Renvoie l'ensemble des target_id favoris d'un type donné, pour marquer
// rapidement les cœurs dans une liste sans une requête par carte.
export async function fetchFavoriteIds(travelerId, targetType) {
  if (!travelerId) return new Set()
  const { data, error } = await supabase
    .from('favorites').select('target_id').eq('traveler_id', travelerId).eq('target_type', targetType)
  if (error) return new Set()
  return new Set(data.map(f => f.target_id))
}

export async function addFavorite(travelerId, targetType, targetId, targetLabel) {
  const { error } = await supabase.from('favorites').insert({
    traveler_id: travelerId, target_type: targetType, target_id: targetId, target_label: targetLabel,
  })
  if (error && error.code !== '23505') throw error // 23505 = déjà en favoris, on ignore
}

export async function removeFavorite(travelerId, targetType, targetId) {
  const { error } = await supabase.from('favorites')
    .delete().eq('traveler_id', travelerId).eq('target_type', targetType).eq('target_id', targetId)
  if (error) throw error
}

// ============================================================
// Avis
// ============================================================

export async function fetchAgencyReviews(agencyId) {
  const { data, error } = await supabase
    .from('reviews').select('*').eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(r => ({
    id: r.id, agencyId: r.agency_id, travelerId: r.traveler_id,
    travelerName: r.traveler_name, rating: r.rating, comment: r.comment, createdAt: r.created_at,
  }))
}

export async function getMyReviewForAgency(agencyId, travelerId) {
  const { data, error } = await supabase
    .from('reviews').select('*').eq('agency_id', agencyId).eq('traveler_id', travelerId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { id: data.id, rating: data.rating, comment: data.comment }
}

export async function upsertReview(agencyId, travelerId, travelerName, rating, comment) {
  const { error } = await supabase.from('reviews').upsert({
    agency_id: agencyId, traveler_id: travelerId, traveler_name: travelerName,
    rating, comment,
  }, { onConflict: 'agency_id,traveler_id' })
  if (error) throw error
}

export async function deleteReview(reviewId) {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
  if (error) throw error
}

// ============================================================
// Page publique agence
// ============================================================

export async function fetchAgencyListingsPublic(agencyId) {
  const { data, error } = await supabase
    .from('listings').select('*').eq('agency_id', agencyId).eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toListing)
}

// ============================================================
// Abonnements, quota mensuel et paiements Mobile Money
// ============================================================

function startOfMonthISO() {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Utilisation du mois en cours (le quota de 5 annonces gratuites + le
// quota du plan se renouvellent chaque mois calendaire — voir
// check_listing_quota côté base de données, qui est la source de vérité).
export async function fetchAgencyQuotaUsage(agencyId) {
  const since = startOfMonthISO()
  const [listingsRes, boostsRes] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId).gte('created_at', since),
    supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId).eq('boost_source', 'free_plan').gte('created_at', since),
  ])
  return {
    listingsThisMonth: listingsRes.count || 0,
    freeBoostsUsedThisMonth: boostsRes.count || 0,
  }
}

export async function createSubscriptionPayment(agencyId, plan, amount, paymentMethod, reference) {
  const { error } = await supabase.from('subscription_payments').insert({
    agency_id: agencyId, type: 'subscription', plan, amount,
    payment_method: paymentMethod, reference,
  })
  if (error) throw error
}

export async function createBoostPayment(agencyId, listingId, durationDays, amount, paymentMethod, reference) {
  const { error } = await supabase.from('subscription_payments').insert({
    agency_id: agencyId, type: 'boost', listing_id: listingId, boost_duration_days: durationDays,
    amount, payment_method: paymentMethod, reference,
  })
  if (error) throw error
}

function toPayment(row) {
  return {
    id: row.id, agencyId: row.agency_id, type: row.type, plan: row.plan,
    listingId: row.listing_id, boostDurationDays: row.boost_duration_days,
    amount: row.amount, paymentMethod: row.payment_method, reference: row.reference,
    status: row.status, createdAt: row.created_at, reviewedAt: row.reviewed_at,
  }
}

export async function fetchAgencyPayments(agencyId) {
  const { data, error } = await supabase
    .from('subscription_payments').select('*').eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toPayment)
}

// ============================================================
// Admin — validation des paiements
// ============================================================

export async function fetchAllPaymentsAdmin(status) {
  let q = supabase.from('subscription_payments').select('*, agencies(name)')
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({ ...toPayment(row), agencyName: row.agencies?.name }))
}

export async function adminApprovePayment(payment) {
  if (payment.type === 'subscription') {
    const { error } = await supabase.from('agencies').update({
      plan: payment.plan, plan_started_at: new Date().toISOString(),
    }).eq('id', payment.agencyId)
    if (error) throw error
  } else if (payment.type === 'boost') {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + payment.boostDurationDays)
    const { error } = await supabase.from('listings').update({
      boosted: true, boost_source: 'paid', boost_expires_at: expiresAt.toISOString(),
    }).eq('id', payment.listingId)
    if (error) throw error
  }
  const { error } = await supabase.from('subscription_payments').update({
    status: 'approved', reviewed_at: new Date().toISOString(),
  }).eq('id', payment.id)
  if (error) throw error
}

export async function adminRejectPayment(paymentId) {
  const { error } = await supabase.from('subscription_payments').update({
    status: 'rejected', reviewed_at: new Date().toISOString(),
  }).eq('id', paymentId)
  if (error) throw error
}

// ============================================================
// Catégories et destinations (gérées par l'admin, lecture publique)
// ============================================================

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data.map(c => ({ id: c.id, label: c.label }))
}

export async function fetchDestinations() {
  const { data, error } = await supabase.from('destinations').select('name').order('name')
  if (error) throw error
  return data.map(d => d.name)
}

export async function adminAddCategory(id, label) {
  const { error } = await supabase.from('categories').insert({ id, label, sort_order: 999 })
  if (error) throw error
}

export async function adminRemoveCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function adminAddDestination(name) {
  const { error } = await supabase.from('destinations').insert({ name })
  if (error && error.code !== '23505') throw error // déjà présente : on ignore
}

export async function adminRemoveDestination(name) {
  const { error } = await supabase.from('destinations').delete().eq('name', name)
  if (error) throw error
}

// ============================================================
// Vérification d'agence
// ============================================================

export async function createVerificationRequest(agencyId, message, documents) {
  const { error } = await supabase.from('verification_requests').insert({
    agency_id: agencyId, message, documents,
  })
  if (error) throw error
}

function toVerificationRequest(row) {
  return {
    id: row.id, agencyId: row.agency_id, message: row.message, documents: row.documents || [],
    status: row.status, createdAt: row.created_at, reviewedAt: row.reviewed_at,
  }
}

export async function fetchAgencyVerificationRequests(agencyId) {
  const { data, error } = await supabase
    .from('verification_requests').select('*').eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toVerificationRequest)
}

export async function fetchAllVerificationRequestsAdmin(status) {
  let q = supabase.from('verification_requests').select('*, agencies(name)')
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data.map(row => ({ ...toVerificationRequest(row), agencyName: row.agencies?.name }))
}

export async function adminApproveVerification(request) {
  const { error: e1 } = await supabase.from('agencies').update({ verified: true }).eq('id', request.agencyId)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('verification_requests').update({
    status: 'approved', reviewed_at: new Date().toISOString(),
  }).eq('id', request.id)
  if (e2) throw e2
}

export async function adminRejectVerification(requestId) {
  const { error } = await supabase.from('verification_requests').update({
    status: 'rejected', reviewed_at: new Date().toISOString(),
  }).eq('id', requestId)
  if (error) throw error
}

export async function getVerificationDocUrl(path) {
  const { data, error } = await supabase.storage.from('verification-docs').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

// ============================================================
// Signalements
// ============================================================

export async function createReport(data) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: data.reporterId || null,
    target_type: data.targetType,
    target_id: data.targetId,
    target_label: data.targetLabel,
    reason: data.reason,
    message: data.message,
  })
  if (error) throw error
}

function toReport(row) {
  return {
    id: row.id, reporterId: row.reporter_id, targetType: row.target_type, targetId: row.target_id,
    targetLabel: row.target_label, reason: row.reason, message: row.message,
    status: row.status, createdAt: row.created_at,
  }
}

export async function fetchAllReportsAdmin(status) {
  let q = supabase.from('reports').select('*')
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toReport)
}

export async function adminSetReportStatus(reportId, status) {
  const { error } = await supabase.from('reports').update({
    status, reviewed_at: new Date().toISOString(),
  }).eq('id', reportId)
  if (error) throw error
}

// ============================================================
// Admin — utilisateurs (voyageurs)
// ============================================================

export async function fetchAllTravelersAdmin() {
  const { data, error } = await supabase.from('travelers').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toTraveler)
}

export async function adminSetTravelerBlocked(travelerId, blocked) {
  const { error } = await supabase.from('travelers').update({ blocked }).eq('id', travelerId)
  if (error) throw error
}

// Mise en avant gratuite décidée par l'admin (indépendante des boosts
// payants ou inclus dans un plan) — 30 jours, comme les boosts gratuits.
export async function adminFeatureListing(listingId) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  const { error } = await supabase.from('listings').update({
    boosted: true, boost_source: 'admin', boost_expires_at: expiresAt.toISOString(),
  }).eq('id', listingId)
  if (error) throw error
}

export async function adminUnfeatureListing(listingId) {
  const { error } = await supabase.from('listings').update({
    boosted: false, boost_source: null, boost_expires_at: null,
  }).eq('id', listingId)
  if (error) throw error
}

// ============================================================
// Vérifications diverses à l'inscription
// ============================================================

export async function isPhoneTaken(phone) {
  const { data, error } = await supabase.rpc('is_phone_taken', { check_phone: phone })
  if (error) return false // en cas de doute, on laisse Supabase Auth/la contrainte DB trancher
  return Boolean(data)
}

// ============================================================
// Upload de fichiers (photos d'annonces, documents de vérification)
// ============================================================

export async function uploadListingPhoto(agencyId, file) {
  const ext = file.name.split('.').pop()
  const path = `${agencyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('listing-photos').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadVerificationDoc(agencyId, file) {
  const ext = file.name.split('.').pop()
  const path = `${agencyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('verification-docs').upload(path, file)
  if (error) throw error
  return path // privé : on stocke le chemin, pas une URL publique
}

// ============================================================
// "Nous contacter" (footer -> boîte de réception admin)
// ============================================================

export async function createContactMessage(name, email, message) {
  const { error } = await supabase.from('contact_messages').insert({ name, email, message })
  if (error) throw error
}

export async function fetchContactMessagesAdmin(status) {
  let q = supabase.from('contact_messages').select('*')
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data.map(m => ({
    id: m.id, name: m.name, email: m.email, message: m.message,
    status: m.status, createdAt: m.created_at,
  }))
}

export async function adminMarkContactMessageRead(id) {
  const { error } = await supabase.from('contact_messages').update({ status: 'read' }).eq('id', id)
  if (error) throw error
}

// ============================================================
// "Mon casier" — documents (billets, etc.) échangés autour d'une demande
// ============================================================

export async function fetchTravelerFavoritesCount(travelerId) {
  const { count, error } = await supabase
    .from('favorites').select('id', { count: 'exact', head: true })
    .eq('traveler_id', travelerId).in('target_type', ['listing', 'agency'])
  if (error) return 0
  return count || 0
}

export async function fetchTravelerRequestsCount(travelerId) {
  const { count, error } = await supabase
    .from('requests').select('id', { count: 'exact', head: true }).eq('traveler_id', travelerId)
  if (error) return 0
  return count || 0
}

export async function fetchTravelerCasierDocCount(travelerId) {
  const groups = await fetchTravelerCasierGrouped(travelerId).catch(() => [])
  return groups.reduce((sum, g) => sum + g.documents.length, 0)
}

// ============================================================
// Notifications (voyageurs et agences, pas l'admin)
// ============================================================

function toNotification(row) {
  return {
    id: row.id, type: row.type, title: row.title, message: row.message,
    link: row.link, read: row.read, createdAt: row.created_at,
  }
}

export async function fetchNotifications(recipientId, limit = 20) {
  const { data, error } = await supabase
    .from('notifications').select('*').eq('recipient_id', recipientId)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data.map(toNotification)
}

export async function fetchUnreadNotificationsCount(recipientId) {
  const { count, error } = await supabase
    .from('notifications').select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId).eq('read', false)
  if (error) return 0
  return count || 0
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(recipientId) {
  const { error } = await supabase.from('notifications').update({ read: true })
    .eq('recipient_id', recipientId).eq('read', false)
  if (error) throw error
}

// Écoute en direct (Supabase Realtime) les nouvelles notifications d'un
// utilisateur — appelle onInsert(notification) dès qu'une ligne arrive.
// Renvoie une fonction pour se désabonner.
export function subscribeToNotifications(recipientId, onInsert) {
  const channel = supabase
    .channel(`notifications:${recipientId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `recipient_id=eq.${recipientId}`,
    }, (payload) => onInsert(toNotification(payload.new)))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export const DOC_TYPES = [
  { id: 'passeport', label: 'Passeports' },
  { id: 'visa', label: 'Visas' },
  { id: 'billet', label: 'Billets' },
  { id: 'autre', label: 'Autres' },
]

export async function uploadRequestDocument(requestId, file, docType = 'autre') {
  const ext = file.name.split('.').pop()
  const path = `${requestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('request-documents').upload(path, file)
  if (error) throw error

  const { error: insertError } = await supabase.from('request_documents').insert({
    request_id: requestId, path, doc_type: docType, file_name: file.name,
  })
  if (insertError) throw insertError
  return path
}

export async function getRequestDocUrl(path) {
  const { data, error } = await supabase.storage.from('request-documents').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

function toDoc(row) {
  return {
    id: row.id, requestId: row.request_id, path: row.path,
    fileName: row.file_name, docType: row.doc_type, createdAt: row.created_at,
  }
}

export async function fetchRequestDocuments(requestId) {
  const { data, error } = await supabase
    .from('request_documents').select('*').eq('request_id', requestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toDoc)
}

export async function deleteRequestDocument(docId, path) {
  await supabase.storage.from('request-documents').remove([path]).catch(() => {})
  const { error } = await supabase.from('request_documents').delete().eq('id', docId)
  if (error) throw error
}

// Regroupe les demandes du voyageur par annonce (vol/voyage) — plusieurs
// demandes séparées vers la même offre deviennent une seule entrée — et ne
// garde que celles ayant au moins un document.
export async function fetchTravelerCasierGrouped(travelerId) {
  const { data, error } = await supabase
    .from('requests')
    .select('*, request_documents(*)')
    .eq('traveler_id', travelerId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const groups = new Map()
  for (const row of data) {
    const docs = (row.request_documents || []).map(toDoc)
    if (docs.length === 0) continue
    const key = row.listing_id || row.id
    if (!groups.has(key)) {
      groups.set(key, {
        key, listingTitle: row.listing_title, requestIds: [], documents: [], latestAt: row.created_at,
      })
    }
    const g = groups.get(key)
    g.requestIds.push(row.id)
    g.documents.push(...docs)
    if (new Date(row.created_at) > new Date(g.latestAt)) g.latestAt = row.created_at
  }
  return Array.from(groups.values()).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
}

// ============================================================
// Admin
// ============================================================

export async function checkIsAdmin(userId) {
  const { data, error } = await supabase.from('admins').select('id').eq('id', userId).maybeSingle()
  if (error) return false
  return Boolean(data)
}

export async function fetchAllAgenciesAdmin() {
  const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toAgency)
}

export async function adminSetAgencyVerified(agencyId, verified) {
  const { error } = await supabase.from('agencies').update({ verified }).eq('id', agencyId)
  if (error) throw error
}

export async function adminSetAgencySuspended(agencyId, suspended) {
  const { error } = await supabase.from('agencies').update({ suspended }).eq('id', agencyId)
  if (error) throw error
}

export async function adminSetAgencyPlan(agencyId, plan) {
  const { error } = await supabase.from('agencies').update({ plan }).eq('id', agencyId)
  if (error) throw error
}

export async function fetchAllListingsAdmin() {
  const { data, error } = await supabase
    .from('listings').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toListing)
}

export async function adminSetListingStatus(listingId, status) {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId)
  if (error) throw error
}

export async function adminDeleteListing(listingId) {
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  if (error) throw error
}

export async function fetchGlobalStats() {
  const [agenciesRes, listingsRes, requestsRes] = await Promise.all([
    supabase.from('agencies').select('verified, suspended, plan', { count: 'exact' }),
    supabase.from('listings').select('status, views, clicks, destination_country', { count: 'exact' }),
    supabase.from('requests').select('id', { count: 'exact', head: true }),
  ])
  if (agenciesRes.error) throw agenciesRes.error
  if (listingsRes.error) throw listingsRes.error
  if (requestsRes.error) throw requestsRes.error

  const agencies = agenciesRes.data
  const listings = listingsRes.data

  const destinationCounts = {}
  for (const l of listings) {
    if (!l.destination_country) continue
    destinationCounts[l.destination_country] = (destinationCounts[l.destination_country] || 0) + 1
  }
  const topDestinations = Object.entries(destinationCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([destination, count]) => ({ destination, count }))

  return {
    totalAgencies: agencies.length,
    verifiedAgencies: agencies.filter(a => a.verified).length,
    suspendedAgencies: agencies.filter(a => a.suspended).length,
    agenciesByPlan: {
      free: agencies.filter(a => a.plan === 'free').length,
      standard: agencies.filter(a => a.plan === 'standard').length,
      premium: agencies.filter(a => a.plan === 'premium').length,
    },
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === 'active').length,
    totalViews: listings.reduce((s, l) => s + (l.views || 0), 0),
    totalClicks: listings.reduce((s, l) => s + (l.clicks || 0), 0),
    totalRequests: requestsRes.count || 0,
    topDestinations,
  }
}
