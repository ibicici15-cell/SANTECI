import { useEffect, useState, useRef } from 'react'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'

export default function MessagerieLabo() {
  const { utilisateur, role } = useAuth()
  const [conversations, setConversations] = useState([])
  const [conversationActive, setConversationActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [texte, setTexte] = useState('')
  const [chargement, setChargement] = useState(true)
  const finRef = useRef(null)

  const nomAutrePartie = (c) => {
    if (role === 'laboratoire') {
      return c.patients ? `${c.patients.prenom} ${c.patients.nom} (patient)` : `${c.professionnels?.prenom} ${c.professionnels?.nom} (pro)`
    }
    return c.laboratoires?.nom
  }

  useEffect(() => {
    (async () => {
      let requete = supabase
        .from('conversations_labo')
        .select('*, laboratoires(nom), patients(nom, prenom), professionnels:demandeur_professionnel_id(nom, prenom)')
        .order('created_at', { ascending: false })

      if (role === 'laboratoire') requete = requete.eq('labo_id', utilisateur.id)
      else if (role === 'patient') requete = requete.eq('demandeur_patient_id', utilisateur.id)
      else requete = requete.eq('demandeur_professionnel_id', utilisateur.id)

      const { data } = await requete
      setConversations(data || [])
      if (data?.length) setConversationActive(data[0])
      setChargement(false)
    })()
  }, [utilisateur.id, role])

  useEffect(() => {
    if (!conversationActive) return
    (async () => {
      const { data } = await supabase
        .from('messages_labo')
        .select('*')
        .eq('conversation_id', conversationActive.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])

      await supabase.from('messages_labo')
        .update({ lu: true })
        .eq('conversation_id', conversationActive.id)
        .eq('lu', false)
        .neq('expediteur_id', utilisateur.id)
    })()

    const canal = supabase
      .channel(`messages-labo-${conversationActive.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_labo', filter: `conversation_id=eq.${conversationActive.id}` },
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
    const { data, error } = await supabase.from('messages_labo').insert({
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
      <h1 className="font-display text-2xl font-bold text-charbon mb-6 flex items-center gap-2">
        <FlaskConical className="text-foret" size={24} /> Messagerie laboratoire
      </h1>

      <div className="carte grid sm:grid-cols-3 h-[32rem] overflow-hidden">
        <div className="border-r border-ligne overflow-y-auto">
          {conversations.length === 0 && <p className="text-ardoise text-sm p-4">Aucune conversation.</p>}
          {conversations.map(c => (
            <button key={c.id} onClick={() => setConversationActive(c)}
              className={`w-full text-left p-4 border-b border-ligne hover:bg-charbon/5 ${conversationActive?.id === c.id ? 'bg-foret-light' : ''}`}>
              <p className="font-medium text-sm">{nomAutrePartie(c)}</p>
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
