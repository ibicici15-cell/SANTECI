import {
  PUBLISHING_RULES_TITLE, PUBLISHING_RULES_INTRO, PUBLISHING_RULES_PROHIBITED,
  PUBLISHING_RULES_ANTI_CIRCUMVENTION, PUBLISHING_RULES_ENGAGEMENT,
} from '../data/publishingRules'

export default function PublishingRules({ compact = false }) {
  return (
    <div className={compact ? 'text-sm' : ''}>
      {!compact && <h3 className="font-display font-semibold text-lg text-ink mb-2">{PUBLISHING_RULES_TITLE}</h3>}
      <p className="text-ink/85">{PUBLISHING_RULES_INTRO}</p>
      <p className="text-ink/85 mt-2">Sont notamment interdits :</p>
      <ul className="mt-1.5 space-y-1">
        {PUBLISHING_RULES_PROHIBITED.map(item => (
          <li key={item} className="text-ink/85 flex gap-2">
            <span className="text-red-500">✕</span>{item}
          </li>
        ))}
      </ul>
      <div className="mt-3 bg-orange/10 border border-orange/30 rounded-lg p-3">
        <p className="text-ink/80">{PUBLISHING_RULES_ANTI_CIRCUMVENTION}</p>
      </div>
      <p className="text-ink/60 text-xs mt-3">{PUBLISHING_RULES_ENGAGEMENT}</p>
    </div>
  )
}
