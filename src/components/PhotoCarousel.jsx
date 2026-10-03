import { useState } from 'react'

export default function PhotoCarousel({ photos, alt, children }) {
  const [index, setIndex] = useState(0)

  function prev(e) {
    e.stopPropagation()
    setIndex(i => (i - 1 + photos.length) % photos.length)
  }
  function next(e) {
    e.stopPropagation()
    setIndex(i => (i + 1) % photos.length)
  }

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden bg-stub h-72">
        <img src={photos[index]} alt={alt} className="w-full h-full object-cover" />
        {children}

        {photos.length > 1 && (
          <>
            <button
              onClick={prev} aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-sm text-lg flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={next} aria-label="Photo suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-sm text-lg flex items-center justify-center"
            >
              ›
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setIndex(i)} className="shrink-0">
              <img
                src={p} alt=""
                className={`w-16 h-16 object-cover rounded-lg ${i === index ? 'ring-2 ring-green' : 'opacity-70'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
