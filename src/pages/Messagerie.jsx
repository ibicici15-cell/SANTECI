import { useEffect, useState, useRef } from 'react'
import { MessageSquare, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'

// Pour un professionnel, la messagerie principale réunit désormais deux
// sources : les conversations avec ses patients (table "messages") ET les
// conversations avec ses confrères issues d'une collaboration acceptée
// (table "messages_collaboration") — elles restent aussi consultables
// séparément dans "Messagerie confrères", mais apparaissent ici aussi.
const TABLE_PAR_TYPE = { principale: 'messages', collaboration: 'messages_collaboration' }

export default function Messagerie() {
  const { utilisateur, role } = useAuth()
  const [conversations, setConversations] = useState([])
  const [conversationActive, setConversationActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [chargement, setChargement] = useState(true)
  const [nonLusParConversation, setNonLusParConversation] = useState({})
  const finRef = useRef(null)

  const colonneAutre = role === 'patient' ? 'professionnels' : 'patients'
  const champMoiId = role === 'patient' ? 'patient_id' : 'professionnel_id'

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('conversations')
        .select(`*, ${colonneAutre}(nom, prenom)`)
        .eq(champMoiId, utilisateur.id)
        .order('created_at', { ascending: false })

      const principales = (data || []).map(c => ({
        id: c.id, type: 'principale', raw: c,
        nomAffiche: `${role === 'patient' ? 'Dr ' : ''}${c[colonneAutre]?.prenom || ''} ${c[colonneAutre]?.nom || ''}`.trim(),
        sousTitre: null,
      }))

      let collaborations = []
      if (role === 'professionnel') {
        const { data: convosCollab } = await supabase
          .from('conversations_collaboration')
          .select('*, pro_a:professionnel_a_id(nom, prenom, specialite), pro_b:professionnel_b_id(nom, prenom, specialite)')
          .or(`professionnel_a_id.eq.${utilisateur.id},professionnel_b_id.eq.${utilisateur.id}`)
          .order('created_at', { ascending: false })

        collaborations = (convosCollab || []).map(c => {
          const autre = c.professionnel_a_id === utilisateur.id ? c.pro_b : c.pro_a
          return {
            id: c.id, type: 'collaboration', raw: c,
            nomAffiche: `Dr ${autre?.prenom || ''} ${autre?.nom || ''}`.trim(),
            sousTitre: 'Confrère',
          }
        })
      }

      const toutes = [...principales, ...collaborations]
        .sort((a, b) => new Date(b.raw.created_at) - new Date(a.raw.created_at))

      setConversations(toutes)
      if (toutes.length) setConversationActive(toutes[0])
      setChargement(false)

      // Compte les messages non lus (pas envoyés par moi), toutes sources confondues
      const compteurs = {}
      const { data: nonLus } = await supabase
        .from('messages').select('conversation_id').eq('lu', false).neq('expediteur_id', utilisateur.id)
      for (const m of nonLus || []) compteurs[m.conversation_id] = (compteurs[m.conversation_id] || 0) + 1
      if (role === 'professionnel') {
        const { data: nonLusCollab } = await supabase
          .from('messages_collaboration').select('conversation_id').eq('lu', false).neq('expediteur_id', utilisateur.id)
        for (const m of nonLusCollab || []) compteurs[m.conversation_id] = (compteurs[m.conversation_id] || 0) + 1
      }
      setNonLusParConversation(compteurs)
    })()
  }, [utilisateur.id, role])

  useEffect(() => {
    if (!conversationActive) return
    const table = TABLE_PAR_TYPE[conversationActive.type]

    ;(async () => {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('conversation_id', conversationActive.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])

      await supabase.from(table)
        .update({ lu: true })
        .eq('conversation_id', conversationActive.id)
        .eq('lu', false)
        .neq('expediteur_id', utilisateur.id)
      setNonLusParConversation(c => ({ ...c, [conversationActive.id]: 0 }))
    })()

    const canal = supabase
      .channel(`${table}-${conversationActive.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `conversation_id=eq.${conversationActive.id}` },
        (payload) => {
          setMessages(m => (m.some(x => x.id === payload.new.id) ? m : [...m, payload.new]))
          if (payload.new.expediteur_id !== utilisateur.id) {
            supabase.from(table).update({ lu: true }).eq('id', payload.new.id)
          }
        })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [conversationActive])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const envoyer = async (e) => {
    e.preventDefault()
    if (!texte.trim() || !conversationActive) return
    const contenu = texte
    setTexte('')
    const table = TABLE_PAR_TYPE[conversationActive.type]

    const { data, error } = await supabase.from(table).insert({
      conversation_id: conversationActive.id,
      expediteur_id: utilisateur.id,
      contenu,
    }).select().single()

    if (error) {
      alert("Le message n'a pas pu être envoyé : " + error.message)
      setTexte(contenu)
      return
    }

    // Affichage immédiat côté émetteur : on n'attend pas le canal realtime
    // (qui peut ne pas être activé sur ces tables — voir README).
    setMessages(m => (m.some(x => x.id === data.id) ? m : [...m, data]))
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon mb-6 flex items-center gap-2">
        <MessageSquare className="text-foret" size={24} /> Messagerie sécurisée
      </h1>

      <div className="carte grid sm:grid-cols-3 h-[32rem] overflow-hidden">
        <div className="border-r border-ligne overflow-y-auto">
          {conversations.length === 0 && <p className="text-ardoise text-sm p-4">Aucune conversation.</p>}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setConversationActive(c)}
              className={`w-full text-left p-4 border-b border-ligne hover:bg-charbon/5 flex items-center justify-between gap-2 ${conversationActive?.id === c.id ? 'bg-foret-light' : ''}`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate flex items-center gap-1.5">
                  {c.type === 'collaboration' && <Users size={13} className="text-ardoise shrink-0" />}
                  {c.nomAffiche}
                </p>
                {c.sousTitre && <p className="text-xs text-ardoise">{c.sousTitre}</p>}
              </div>
              {nonLusParConversation[c.id] > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-alerte text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {nonLusParConversation[c.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="sm:col-span-2 flex flex-col">
          {conversationActive ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(m => (
                  <div key={m.id} className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${m.expediteur_id === utilisateur.id ? 'ml-auto bg-foret text-white' : 'bg-charbon/5 text-charbon'}`}>
                    {m.contenu}
                  </div>
                ))}
                <div ref={finRef} />
              </div>
              <form onSubmit={envoyer} className="border-t border-ligne p-3 flex gap-2">
                <input className="champ" placeholder="Écrire un message…" value={texte} onChange={e => setTexte(e.target.value)} />
                <button className="btn-primaire !px-4">Envoyer</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ardoise text-sm">Sélectionnez une conversation</div>
          )}
        </div>
      </div>
    </div>
  )
}
