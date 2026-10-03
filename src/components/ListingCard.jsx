import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'

function formatPrice(price) {
  if (price == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

export default function ListingCard({ listing, isFavorited = false, onFavoriteToggle }) {
  const photo = listing.photos?.[0]

  return (
    <Link
      to={`/annonce/${listing.id}`}
      className="group relative flex bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-ink/5"
    >
      {listing.boosted && (
        <span className="absolute top-3 left-3 z-10 bg-orange text-ink text-[11px] font-display font-bold px-2 py-1 rounded-md tracking-wide">
          BOOST
        </span>
      )}

      <FavoriteButton
        targetType="listing" targetId={listing.id} targetLabel={listing.title}
        initialFavorited={isFavorited} onToggle={onFavoriteToggle}
        className="absolute top-2 right-2 z-10 w-8 h-8 text-xl bg-white/90 shadow-sm"
      />

      {photo && (
        <div className="w-28 sm:w-36 shrink-0 bg-stub relative">
          <img src={photo} alt={listing.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
        <div className="text-xs uppercase tracking-wide text-green font-semibold truncate">
          {listing.destinationCountry}{listing.destinationCity ? ` · ${listing.destinationCity}` : ''}
        </div>
        <h3 className="font-display font-semibold text-base sm:text-lg text-ink truncate mt-0.5">
          {listing.title}
        </h3>
        <div className="text-sm text-ink/60 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>Départ {listing.departureCity}</span>
          <span>·</span>
          <span>{formatDate(listing.departureDate)}</span>
        </div>
        {listing.agencyName && (
          <div className="text-xs text-ink/60 mt-2 truncate">Par {listing.agencyName}</div>
        )}
      </div>

      {/* Talon façon billet d'embarquement */}
      <div className="relative w-32 sm:w-44 shrink-0 bg-ink text-paper flex flex-col items-center justify-center px-3 sm:px-4 py-4">
        <span className="stub-notch -top-2.5 left-1/2 -translate-x-1/2" />
        <span className="stub-notch -bottom-2.5 left-1/2 -translate-x-1/2" />
        <div className="absolute left-0 top-0 bottom-0 w-px bg-dashed-x opacity-30" />
        {listing.offerType === 'billet' ? (
          <>
            <div className="font-mono text-[11px] text-paper/60 uppercase tracking-widest">Billet</div>
            <div className="font-display font-bold text-sm text-center leading-tight">🎫</div>
          </>
        ) : (
          <>
            <div className="font-mono text-[11px] text-paper/60 uppercase tracking-widest">Durée</div>
            <div className="font-display font-bold text-lg">{listing.durationDays}j</div>
          </>
        )}
        <div className="font-mono text-[11px] text-paper/60 uppercase tracking-widest mt-3">Prix</div>
        <div className="font-display font-bold text-base text-orange text-center leading-tight">
          {formatPrice(listing.price)}
        </div>
      </div>
    </Link>
  )
}
