import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notifyCountsChanged } from '../utils/countsBus'
import ChatThread from '../components/ChatThread'
import useDeepLink from '../utils/useDeepLink'
import { buildTimeline } from '../utils/chatTimeline'
import {
  fetchAgencyRequests, markRequestStatus, replyToRequest,
  fetchChatMessages, sendChatMessage, subscribeToChatMessages,
  uploadRequestDocument, fetchRequestDocuments, deleteRequestDocument, getRequestDocUrl, DOC_TYPES,
} from '../utils/db'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function AgencyRequests() {
  const { user } = useAuth()
  const { hash, key: locationKey } = useLocation()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedKey, setSelectedKey] = useState(null)
  const [chat, setChat] = useState([])
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [pendingDocType, setPendingDocType] = useState('autre')
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // `silent` : recharge sans écran « Chargement… » (la conversation reste affichée)
  async function load(silent = false) {
    if (!silent) setLoading(true)
    const reqs = await fetchAgencyRequests(user.id)
    setRequests(reqs)
    // la table des messages peut ne pas encore exister : on n'en fait pas planter la page
    setChat(await fetchChatMessages(reqs.map(r => r.id)).catch(() => []))
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  // Rafraîchissement automatique : nouvelles demandes et messages du voyageur
  useEffect(() => {
    if (!user) return
    const tick = () => { if (document.visibilityState === 'visible') load(true).catch(() => {}) }
    const timer = setInterval(tick, 6000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [user?.id])

  // Nouveaux messages du voyageur, en direct
  const requestIdsRef = useRef(new Set())
  requestIdsRef.current = new Set(requests.map(r => r.id))
  useEffect(() => {
    if (!user) return
    return subscribeToChatMessages((m) => {
      if (!requestIdsRef.current.has(m.requestId)) return
      setChat(list => (list.some(x => x.id === m.id) ? list : [...list, m]))
    })
  }, [user?.id])

  // Regroupe les demandes par voyageur + annonce : plusieurs demandes
  // séparées vers la même offre deviennent une seule conversation.
  const conversations = useMemo(() => {
    const map = new Map()
    for (const r of requests) {
      const key = `${r.travelerId || r.phone}__${r.listingId || r.listingTitle}`
      if (!map.has(key)) {
        map.set(key, {
          key, travelerName: r.travelerName, phone: r.phone, whatsapp: r.whatsapp,
          listingTitle: r.listingTitle, messages: [], latestAt: r.createdAt, hasNew: false,
        })
      }
      const c = map.get(key)
      c.messages.push(r)
      if (new Date(r.createdAt) > new Date(c.latestAt)) c.latestAt = r.createdAt
      if (r.status === 'new') c.hasNew = true
    }
    for (const c of map.values()) c.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    return Array.from(map.values()).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
  }, [requests])

  // Lien profond (notification) : #demande-<id> ouvre la bonne conversation, à chaque clic.
  useDeepLink({
    hash, locationKey, ready: !loading, data: conversations,
    find: (id) => conversations.find(conv => conv.messages.some(m => m.id === id)),
    onFound: (c) => selectConversation(c),
    refresh: () => load(true),
  })

  const selected = conversations.find(c => c.key === selectedKey) || null
  const latestRequest = selected?.messages[selected.messages.length - 1]

  async function selectConversation(c) {
    setSelectedKey(c.key)
    const newOnes = c.messages.filter(m => m.status === 'new')
    if (newOnes.length > 0) {
      await Promise.all(newOnes.map(m => markRequestStatus(m.id, 'read')))
      load(true)
      notifyCountsChanged()
    }
  }

  useEffect(() => {
    if (!latestRequest) { setDocs([]); return }
    setLoadingDocs(true)
    fetchRequestDocuments(latestRequest.id).then(setDocs).finally(() => setLoadingDocs(false))
  }, [latestRequest?.id])

  const timeline = selected ? buildTimeline(selected.messages, chat) : []

  // 1er message à une demande restée sans réponse : réponse « officielle »
  // (marque la demande traitée). Ensuite : discussion libre, sans limite.
  async function sendMessage(body) {
    const awaiting = selected.messages.find(m => !m.agencyReply)
    if (awaiting) {
      await replyToRequest(awaiting.id, body)
      await load(true)
    } else {
      const msg = await sendChatMessage(latestRequest.id, 'agency', user.id, body)
      setChat(list => (list.some(x => x.id === msg.id) ? list : [...list, msg]))
    }
  }

  const [uploadError, setUploadError] = useState('')

  function selectFiles(e) {
    setUploadError('')
    setPendingFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  async function confirmSendFiles() {
    if (pendingFiles.length === 0 || !latestRequest) return
    setUploadingDoc(true)
    setUploadError('')
    try {
      for (const file of pendingFiles) await uploadRequestDocument(latestRequest.id, file, pendingDocType)
      setPendingFiles([])
      setDocs(await fetchRequestDocuments(latestRequest.id))
    } catch (err) {
      console.error('Erreur envoi document :', err)
      setUploadError(`Échec de l'envoi : ${err.message || 'erreur inconnue'}.`)
    } finally {
      setUploadingDoc(false)
    }
  }

  function removePendingFile(index) {
    setPendingFiles(files => files.filter((_, i) => i !== index))
  }

  async function removeDoc(doc) {
    if (!confirm('Supprimer ce document ?')) return
    await deleteRequestDocument(doc.id, doc.path)
    setDocs(d => d.filter(x => x.id !== doc.id))
  }

  async function openDoc(doc) {
    window.open(await getRequestDocUrl(doc.path), '_blank')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-ink mb-4">Demandes reçues</h1>

      {loading && <p className="text-ink/60">Chargement…</p>}
      {!loading && conversations.length === 0 && (
        <div className="border border-dashed border-ink/20 rounded-2xl p-10 text-center text-ink/60">
          Aucune demande pour le moment.
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div className="grid md:grid-cols-[280px_1fr] border border-ink/10 rounded-2xl overflow-hidden bg-white min-h-[420px]">
          {/* Colonne gauche : noms + aperçu */}
          <div className={`border-r border-ink/10 divide-y divide-ink/10 overflow-y-auto ${selected ? 'hidden md:block' : ''}`}>
            {conversations.length === 0 && <p className="p-4 text-sm text-ink/60">Aucune conversation.</p>}
            {conversations.map(c => (
              <button
                key={c.key} onClick={() => selectConversation(c)}
                className={`w-full text-left px-4 py-3 hover:bg-stub/50 transition-colors ${selectedKey === c.key ? 'bg-stub' : ''} ${c.hasNew ? 'bg-orange/5' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate ${c.hasNew ? 'font-bold text-ink' : 'font-medium text-ink/80'}`}>
                    {c.hasNew && <span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-1.5" />}
                    {c.travelerName}
                  </span>
                  <span className="text-xs text-ink/55 shrink-0">{timeAgo(c.latestAt)}</span>
                </div>
                <div className="text-xs text-ink/55 truncate mt-0.5">{c.listingTitle}</div>
              </button>
            ))}
          </div>

          {/* Colonne droite : détail de la conversation sélectionnée */}
          <div className={selected ? '' : 'hidden md:flex md:items-center md:justify-center'}>
            {!selected && <p className="text-ink/55 text-sm">Sélectionnez une conversation.</p>}

            {selected && (
              <div className="p-4">
                <button onClick={() => setSelectedKey(null)} className="md:hidden text-sm text-green font-semibold mb-3">← Retour</button>

                <div className="pb-3 border-b border-ink/10">
                  <div className="font-display font-bold text-lg text-ink">{selected.travelerName}</div>
                  <div className="text-sm text-ink/85">{selected.listingTitle}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/85 mt-2">
                    <span>📞 {selected.phone}</span>
                    {selected.whatsapp && <span>💬 {selected.whatsapp}</span>}
                  </div>
                </div>

                <ChatThread
                  key={selected.key} items={timeline} role="agency" otherLabel={selected.travelerName} onSend={sendMessage}
                  renderExtra={(it) => it.request && (
                    <div className="mt-1 text-xs opacity-80">
                      {it.request.travelersCount} voyageur{it.request.travelersCount > 1 ? 's' : ''}
                      {it.request.desiredDate && ` · ${it.request.desiredDate}`}
                      {it.request.paymentReference && <div>💳 Référence : <b>{it.request.paymentReference}</b></div>}
                    </div>
                  )}
                />

                {/* Mon casier pour cette conversation */}
                <div className="bg-stub rounded-lg p-3 mt-1">
                  <div className="text-xs font-semibold text-ink/85 mb-2">Mon casier — envoyer un document</div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {DOC_TYPES.map(t => (
                      <button key={t.id} type="button" onClick={() => setPendingDocType(t.id)}
                        className={`chip !py-1 !px-2.5 text-xs ${pendingDocType === t.id ? 'chip-active' : 'chip-inactive'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="file" accept="image/*,.pdf" multiple onChange={selectFiles}
                    className="block w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-white file:text-ink file:text-xs"
                  />
                  {pendingFiles.length > 0 && (
                    <div className="mt-2 bg-white rounded-lg p-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {pendingFiles.map((file, i) => (
                          <div key={i} className="relative">
                            {file.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(file)} alt="" className="w-14 h-14 object-cover rounded-lg" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-stub flex items-center justify-center text-xl">📄</div>
                            )}
                            <button onClick={() => removePendingFile(i)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink/85">{pendingFiles.length} fichier(s) — type : {DOC_TYPES.find(t => t.id === pendingDocType)?.label}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setPendingFiles([])} className="text-xs text-ink/60">Annuler</button>
                          <button onClick={confirmSendFiles} disabled={uploadingDoc} className="text-xs font-semibold text-green">
                            {uploadingDoc ? 'Envoi…' : "Confirmer l'envoi"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}

                  {loadingDocs && <p className="text-xs text-ink/55 mt-2">Chargement des documents…</p>}
                  {!loadingDocs && docs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {docs.map(d => (
                        <span key={d.id} className="inline-flex items-center gap-1.5 bg-white rounded-lg pl-2.5 pr-1 py-1 text-xs text-ink">
                          <button onClick={() => openDoc(d)} className="hover:underline">
                            📄 {d.fileName || DOC_TYPES.find(t => t.id === d.docType)?.label || 'Document'}
                          </button>
                          <button onClick={() => removeDoc(d)} className="text-red-500 w-4 h-4 flex items-center justify-center">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
