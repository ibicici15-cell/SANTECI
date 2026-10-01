/** Petit badge rouge "non lu", à poser à côté d'un lien de navigation. */
export default function PastilleLien({ compte }) {
  if (!compte) return null
  return (
    <span className="ml-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-alerte text-white text-[10px] font-bold inline-flex items-center justify-center align-middle">
      {compte > 9 ? '9+' : compte}
    </span>
  )
}
