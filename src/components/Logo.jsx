// Logo "Agnini Sanfè" : wordmark en Space Grotesk, trajectoire orange
// pointillée sous le texte qui remonte à la fin, avion vert en bout de
// course. `light` bascule le texte en clair pour les fonds sombres
// (footer, hero) — les couleurs orange/vert restent inchangées.

const PLANE_PATH = "M-40,0 Q-38,-4 -20,-4 Q0,-4 8,0 Q0,4 -20,4 Q-38,4 -40,0 Z M-22,3 L-30,16 L-14,4 Z M-34,-3 L-38,-14 L-28,-4 Z"

export default function Logo({ className = 'h-9', light = false }) {
  const textFill = light ? '#FAFAF7' : '#201D19'
  return (
    <svg viewBox="0 0 400 115" className={className} role="img" aria-label="Agnini Sanfè">
      <text
        x="10" y="62"
        fontFamily="'Space Grotesk', sans-serif" fontWeight="700"
        fontSize="46" letterSpacing="-1" fill={textFill}
      >
        Agnini <tspan fill="#F77F00">Sanfè</tspan>
      </text>
      <path d="M15,80 C160,110 260,70 336,22" fill="none" stroke="#F77F00" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7" />
      <g transform="translate(342,19) rotate(-18) scale(1.5)">
        <path d={PLANE_PATH} fill="#00A651" />
      </g>
    </svg>
  )
}

// Marque avion seule — favicon, icône d'app, badges compacts.
export function PlaneMark({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="-45 -30 90 60" className={className} role="img" aria-label="Agnini Sanfè">
      <path d={PLANE_PATH} fill="#00A651" />
    </svg>
  )
}
