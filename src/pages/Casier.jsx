import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchTravelerCasierGrouped, getRequestDocUrl, DOC_TYPES } from '../utils/db'
import useDeepLink from '../utils/useDeepLink'

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

export default function Casier() {
  const { traveler } = useAuth()
  const { hash, key: locationKey } = useLocation()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState(null)
  const [openingDoc, setOpeningDoc] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!traveler) return
    fetchTravelerCasierGrouped(traveler.id).then(setGroups).finally(() => setLoading(false))
  }, [traveler?.id])

  // Lien profond (notification « nouveau document ») : #demande-<id> ouvre le bon dossier.
  useDeepLink({
    hash, locationKey, ready: !loading, data: groups,
    find: (id) => groups.find(g => g.requestIds.includes(id)),
    onFound: (g) => { setDateFrom(''); setDateTo(''); setSelectedKey(g.key) },
    refresh: () => fetchTravelerCasierGrouped(traveler.id).then(setGroups).catch(() => {}),
  })

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const d = new Date(g.latestAt)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [groups, dateFrom, dateTo])

  const selected = filteredGroups.find(g => g.key === selectedKey) || null

  async function openDoc(path) {
    setOpeningDoc(path)
    try {
      const url = await getRequestDocUrl(path)
      window.open(url, '_blank')
    } finally {
      setOpeningDoc(null)
    }
  }

  if (!traveler) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-ink/60">Chargement du profil…</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-ink mb-1">Mon casier</h1>
      <p className="text-ink/60 text-sm mb-4">
        Les documents envoyés par les agences (billets, visas, passeport…), rangés par vol/voyage.
      </p>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <label className="text-xs font-semibold text-ink/60">Depuis le</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input !py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink/60">Jusqu'au</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input !py-1.5 text-sm" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-green font-semibold pb-2">Réinitialiser</button>
        )}
      </div>

      {loading && <p className="text-ink/60">Chargement…</p>}

      {!loading && filteredGroups.length === 0 && (
        <div className="border border-dashed border-ink/20 rounded-2xl p-10 text-center text-ink/60">
          Aucun document pour le moment. Ils apparaîtront ici dès qu'une agence t'en enverra un depuis{' '}
          <Link to="/mes-demandes" className="text-green font-semibold">tes demandes</Link>.
        </div>
      )}

      {!loading && filteredGroups.length > 0 && (
        <div className="grid md:grid-cols-[260px_1fr] border border-ink/10 rounded-2xl overflow-hidden bg-white min-h-[300px]">
          <div className={`border-r border-ink/10 ${selected ? 'hidden md:block' : ''}`}>
            <div className="px-4 py-2.5 text-xs font-semibold text-ink/60 uppercase tracking-wide border-b border-ink/10">
              Mes vols / voyages
            </div>
            <div className="divide-y divide-ink/10">
              {filteredGroups.map(g => (
                <button
                  key={g.key} onClick={() => setSelectedKey(g.key)}
                  className={`w-full text-left px-4 py-3 hover:bg-stub/50 transition-colors ${selectedKey === g.key ? 'bg-stub' : ''}`}
                >
                  <div className="font-medium text-ink truncate">{g.listingTitle}</div>
                  <div className="text-xs text-ink/55 mt-0.5">{g.documents.length} document(s) · {formatDate(g.latestAt)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={selected ? '' : 'hidden md:flex md:items-center md:justify-center'}>
            {!selected && <p className="text-ink/55 text-sm">Sélectionnez un vol ou un voyage.</p>}

            {selected && (
              <div className="p-4 w-full">
                <button onClick={() => setSelectedKey(null)} className="md:hidden text-sm text-green font-semibold mb-3">← Retour</button>
                <div className="px-0 py-2 text-xs font-semibold text-ink/60 uppercase tracking-wide border-b border-ink/10 mb-3">
                  Mes documents — {selected.listingTitle}
                </div>

                {DOC_TYPES.map(type => {
                  const docsOfType = selected.documents.filter(d => d.docType === type.id)
                  if (docsOfType.length === 0) return null
                  return (
                    <div key={type.id} className="mb-4">
                      <div className="text-xs font-semibold text-ink/85 mb-1.5">{type.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {docsOfType.map((d, i) => (
                          <button
                            key={d.id} onClick={() => openDoc(d.path)} disabled={openingDoc === d.path}
                            className="text-sm bg-stub hover:bg-stub/70 px-3 py-1.5 rounded-lg text-ink"
                          >
                            📄 {d.fileName || `${type.label} ${docsOfType.length > 1 ? i + 1 : ''}`} {openingDoc === d.path ? '…' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
