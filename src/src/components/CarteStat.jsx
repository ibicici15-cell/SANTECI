export default function CarteStat({ label, valeur, accent = 'foret', Icone }) {
  const couleurs = {
    foret: 'text-foret',
    ambre: 'text-ambre',
    ocre: 'text-ocre',
  }
  const fondsIcone = {
    foret: 'bg-foret-light text-foret',
    ambre: 'bg-ambre-light text-ambre-dark',
    ocre: 'bg-ocre/15 text-ocre',
  }
  return (
    <div className="carte p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ardoise">{label}</p>
        {Icone && (
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fondsIcone[accent]}`}>
            <Icone size={16} />
          </span>
        )}
      </div>
      <p className={`font-donnee text-3xl font-semibold mt-1 ${couleurs[accent]}`}>{valeur}</p>
    </div>
  )
}
