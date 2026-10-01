/** Point rouge "non lu" pour une ligne de liste (comme un message non lu). */
export default function PointNonLu({ actif }) {
  if (!actif) return null
  return <span className="inline-block w-2 h-2 rounded-full bg-alerte shrink-0" aria-label="non lu" />
}
