// ============================================================
// Recherche de vols — DONNÉES SIMULÉES.
//
// Ce fichier isole tout ce qui concerne les vols pour qu'on puisse
// brancher un vrai fournisseur (Travelpayouts, Duffel, etc.) plus tard
// sans toucher au reste de l'application : il suffira de remplacer le
// contenu de `searchFlights()` par un vrai appel réseau, en gardant la
// même forme d'objet en sortie.
//
// Un vol retourné a la forme :
// {
//   id, airline, flightNumber, origin, destination,
//   departureDate, departureTime, arrivalTime, durationMinutes,
//   stops, baggage, price, currency, bookingUrl, updatedAt,
// }
// ============================================================

const AIRLINES = [
  { name: 'Air France', code: 'AF' },
  { name: 'Turkish Airlines', code: 'TK' },
  { name: 'Ethiopian Airlines', code: 'ET' },
  { name: 'Emirates', code: 'EK' },
  { name: 'Royal Air Maroc', code: 'AT' },
  { name: 'Brussels Airlines', code: 'SN' },
  { name: 'Kenya Airways', code: 'KQ' },
]

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Simule un appel API (latence réseau comprise) et renvoie 3 à 5 vols
// plausibles pour un trajet donné. À remplacer par un vrai appel HTTP.
export async function searchFlights({ origin, destination, departureDate }) {
  await new Promise(r => setTimeout(r, 500))

  if (!origin || !destination) return []

  const seed = hashString(`${origin}-${destination}-${departureDate || ''}`)
  const rand = seededRandom(seed)
  const count = 3 + Math.floor(rand() * 3)

  const flights = []
  for (let i = 0; i < count; i++) {
    const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)]
    const stops = rand() > 0.55 ? 1 : 0
    const basePrice = 350000 + Math.floor(rand() * 300000)
    const depHour = 6 + Math.floor(rand() * 14)
    const durationMinutes = (stops ? 540 : 360) + Math.floor(rand() * 180)
    const arrHour = (depHour + Math.floor(durationMinutes / 60)) % 24

    flights.push({
      id: `${airline.code}-${i}-${seed}`,
      airline: airline.name,
      flightNumber: `${airline.code}${100 + Math.floor(rand() * 800)}`,
      origin,
      destination,
      departureDate: departureDate || null,
      departureTime: `${String(depHour).padStart(2, '0')}:${rand() > 0.5 ? '00' : '30'}`,
      arrivalTime: `${String(arrHour).padStart(2, '0')}:${rand() > 0.5 ? '00' : '30'}`,
      durationMinutes,
      stops,
      baggage: rand() > 0.4 ? '1 bagage inclus' : 'Bagage en option',
      price: basePrice,
      currency: 'FCFA',
      // Lien de réservation affilié — à remplacer par le lien réel du
      // fournisseur une fois l'intégration branchée.
      bookingUrl: '#',
      updatedAt: new Date().toISOString(),
    })
  }

  return flights.sort((a, b) => a.price - b.price)
}

export function formatFlightDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${String(m).padStart(2, '0')}`
}
