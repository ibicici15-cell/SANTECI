export default function Loader({ label = 'Chargement…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-ardoise">
      <div className="w-9 h-9 rounded-full border-[3px] border-foret/20 border-t-foret animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
