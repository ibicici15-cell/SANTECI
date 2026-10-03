import { formatFlightDuration } from '../utils/flights'

function formatPrice(price) {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}

export default function FlightCard({ flight }) {
  return (
    <div className="relative flex bg-white rounded-2xl shadow-sm border border-ink/5 overflow-hidden">
      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="text-xs uppercase tracking-wide text-ink/60 font-semibold font-mono">
          {flight.airline} · {flight.flightNumber}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-display font-semibold text-lg text-ink">{flight.departureTime}</span>
          <span className="flex-1 h-px bg-ink/15 relative">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] text-ink/55 whitespace-nowrap">
              {formatFlightDuration(flight.durationMinutes)}
            </span>
          </span>
          <span className="font-display font-semibold text-lg text-ink">{flight.arrivalTime}</span>
        </div>
        <div className="text-sm text-ink/60 mt-1">
          {flight.origin} → {flight.destination}
          {' · '}
          {flight.stops === 0 ? 'Direct' : `${flight.stops} escale${flight.stops > 1 ? 's' : ''}`}
          {' · '}{flight.baggage}
        </div>
      </div>

      <div className="relative w-32 sm:w-40 shrink-0 bg-ink text-paper flex flex-col items-center justify-center px-3 py-4">
        <span className="stub-notch -top-2.5 left-1/2 -translate-x-1/2" />
        <span className="stub-notch -bottom-2.5 left-1/2 -translate-x-1/2" />
        <div className="absolute left-0 top-0 bottom-0 w-px bg-dashed-x opacity-30" />
        <div className="font-display font-bold text-sm text-orange text-center leading-tight">
          {formatPrice(flight.price)}
        </div>
        <a
          href={flight.bookingUrl}
          target="_blank" rel="noopener noreferrer"
          onClick={(e) => { if (flight.bookingUrl === '#') e.preventDefault() }}
          className="mt-2 text-xs font-semibold bg-orange hover:bg-orange-dark text-ink px-3 py-1.5 rounded-lg transition-colors"
        >
          Réserver
        </a>
      </div>
    </div>
  )
}
