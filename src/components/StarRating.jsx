export default function StarRating({ value, onChange, size = 'text-lg', readOnly = false }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className={`inline-flex gap-0.5 ${size}`}>
      {stars.map(n => (
        <span
          key={n}
          onClick={readOnly ? undefined : () => onChange(n)}
          className={`${readOnly ? '' : 'cursor-pointer'} ${n <= value ? 'text-orange' : 'text-ink/20'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}
