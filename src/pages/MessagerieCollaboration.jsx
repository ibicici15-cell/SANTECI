import { useEffect, useState, useRef } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'

export default function MessagerieCollaboration() {
  const { utilisateur } = useAuth()
  const [conversations, setConversations] = useState([])
  const [conversationActive, setConversationActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [chargement, setChargement] = useState(true)
  const finRef = useRef(null)

  const autrePro = (c) => c.professionnel_a_id === utilisateur.id ? c.pro_b : c.pro_a

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('conversations_collaboration')
        .select('*, pro_a:professionnel_a_id(nom, prenom, specialite), pro_b:professionnel_b_id(nom, prenom, specialite)')
        .or(`professionnel_a_id.eq.${utilisateur.id},professionnel_b_id.eq.${utilisateur.id}`)
        .order('created_at', { ascending: false })
      setConversations(data || [])
      if (data?.length) setConversationActive(data[0])
      setChargement(false)
    })()
  }, [utilisateur.id])

  useEffect(() => {
    if (!conversationActive) return
    (async () => {
      const { data } = await supabase
        .from('messages_collaboration')
        .select('*')
        .eq('conversation_id', conversationActive.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])

      await supabase.from('messages_collaboration')
        .update({ lu: true })
        .eq('conversation_id', conversationActive.id)
        .eq('lu', false)
        .neq('expediteur_id', utilisateur.id)
    })()

    const canal = supabase
      .channel(`messages-collab-${conversationActive.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_collaboration', filter: `conversation_id=eq.${conversationActive.id}` },
        (payload) => setMessages(m => (m.some(x => x.id === payload.new.id) ? m : [...m, payload.new])))
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [conversationActive])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const envoyer = async (e) => {
    e.preventDefault()
    if (!texte.trim()) return
    const contenu = texte
    setTexte('')
    const { data, error } = await supabase.from('messages_collaboration').insert({
      conversation_id: conversationActive.id,
      expediteur_id: utilisateur.id,
      contenu,
    }).select().single()
    if (error) { alert("Le message n'a pas pu être envoyé : " + error.message); setTexte(contenu); return }
    setMessages(m => (m.some(x => x.id === data.id) ? m : [...m, data]))
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-charbon mb-2 flex items-center gap-2">
        <Users className="text-foret" size={24} /> Messagerie confrères
      </h1>
      <p className="text-ardoise text-sm mb-6">
        Discutez librement avec un confrère suite à une collaboration acceptée — tarifs et
        modalités se négocient directement entre vous, la plateforme n'intervient pas.
      </p>

      <div className="carte grid sm:grid-cols-3 h-[32rem] overflow-hidden">
        <div className="border-r border-ligne overflow-y-auto">
          {conversations.length === 0 && <p className="text-ardoise text-sm p-4">Aucune conversation pour le moment.</p>}
          {conversations.map(c => {
            const autre = autrePro(c)
            return (
              <button key={c.id} onClick={() => setConversationActive(c)}
                className={`w-full text-left p-4 border-b border-ligne hover:bg-charbon/5 ${conversationActive?.id === c.id ? 'bg-foret-light' : ''}`}>
                <p className="font-medium text-sm">Dr {autre?.prenom} {autre?.nom}</p>
              </button>
            )
          })}
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
