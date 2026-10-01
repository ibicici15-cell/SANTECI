import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import { libelleSpecialite, libelleUrgence } from '../lib/constantes'
import PointNonLu from '../components/PointNonLu'
import useEntitesNonLues from '../hooks/useEntitesNonLues'
import { marquerEntiteLue } from '../lib/notifications'

const LIEN = '/professionnel/collaborations'

const LIBELLES_STATUT_DEST = {
  en_attente: 'En attente',
  acceptee: 'A accepté',
  refusee: 'A refusé',
  ignoree_resolue: 'Résolue ailleurs',
}
const STYLES_STATUT_DEST = {
  en_attente: 'bg-ocre/15 text-ocre',
  acceptee: 'bg-foret-light text-foret-dark',
  refusee: 'bg-alerte/10 text-alerte',
  ignoree_resolue: 'bg-charbon/8 text-ardoise',
}

export default function MesCollaborations() {
  const { utilisateur } = useAuth()
  const nonLus = useEntitesNonLues(utilisateur.id, LIEN)
  const consulter = (demandeId) => { if (nonLus.has(demandeId)) marquerEntiteLue(utilisateur.id, LIEN, demandeId) }
  const [onglet, setOnglet] = useState('envoyees') // 'envoyees' | 'recues'
  const [envoyees, setEnvoyees] = useState([])
  const [recues, setRecues] = useState([])
  const [chargement, setChargement] = useState(true)
  const [enTraitement, setEnTraitement] = useState(null)

  const charger = async () => {
    const [{ data: env }, { data: recu }] = await Promise.all([
      supabase.from('demandes_collaboration')
        .select('*, destinataires_collaboration(*, professionnels(nom, prenom, specialite))')
        .eq('demandeur_id', utilisateur.id)
        .order('created_at', { ascending: false }),
      supabase.from('destinataires_collaboration')
        .select('*, demandes_collaboration(*, professionnels:demandeur_id(nom, prenom, specialite, ville))')
        .eq('professionnel_id', utilisateur.id)
        .order('created_at', { ascending: false }),
    ])
    setEnvoyees(env || [])
    setRecues(recu || [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [utilisateur.id])

  const repondre = async (destinataireId, accepter) => {
    setEnTraitement(destinataireId)
    const { error, data } = await supabase.from('destinataires_collaboration').update({
      statut: accepter ? 'acceptee' : 'refusee', repondu_le: new Date().toISOString(),
    }).eq('id', destinataireId).select()
    setEnTraitement(null)
    if (error) { alert("La réponse n'a pas pu être enregistrée : " + error.message); return }
    if (!data || data.length === 0) { alert("La réponse n'a pas pu être enregistrée (déjà traitée ou droits insuffisants)."); return }
    charger()
  }

  const choisirConfrere = async (demandeId, professionnelId) => {
    setEnTraitement(demandeId)
    const { error } = await supabase.rpc('resoudre_collaboration', {
      p_demande_id: demandeId, p_professionnel_retenu_id: professionnelId,
    })
    setEnTraitement(null)
    if (error) { alert(error.message); return }
    charger()
  }

  if (chargement) return <Loader />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-charbon">Mes collaborations</h1>
        <Link to="/professionnel/trouver-expertise" className="btn-primaire !py-2 !px-4 text-sm">Trouver une expertise</Link>
      </div>

      <div className="flex gap-2 mt-6">
        <button onClick={() => setOnglet('envoyees')} className={`px-4 py-2 rounded-full text-sm font-medium ${onglet === 'envoyees' ? 'bg-foret text-white' : 'bg-charbon/5 text-ardoise'}`}>
          Envoyées ({envoyees.length})
        </button>
        <button onClick={() => setOnglet('recues')} className={`px-4 py-2 rounded-full text-sm font-medium ${onglet === 'recues' ? 'bg-foret text-white' : 'bg-charbon/5 text-ardoise'}`}>
          Reçues ({recues.length})
        </button>
      </div>

      {onglet === 'envoyees' && (
        <div className="space-y-4 mt-6">
          {envoyees.length === 0 && <p className="text-ardoise text-sm">Aucune demande envoyée pour le moment.</p>}
          {envoyees.map(d => (
            <div key={d.id} onClick={() => consulter(d.id)} className="carte p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium flex items-center gap-2"><PointNonLu actif={nonLus.has(d.id)} /> {libelleSpecialite(d.specialite_recherchee)} {d.ville_recherchee ? `· ${d.ville_recherchee}` : ''}</p>
                  <p className="text-xs text-ardoise">{libelleUrgence(d.urgence)} · envoyée le {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <Badge statut={d.statut === 'ouverte' ? 'en_attente' : d.statut === 'resolue' ? 'confirme' : d.statut === 'expiree' ? 'expire' : 'annule'} />
              </div>
              <p className="text-sm text-charbon mt-2">{d.description}</p>

              <div className="mt-3 space-y-2">
                {d.destinataires_collaboration?.map(dest => (
                  <div key={dest.id} className="flex items-center justify-between gap-2 bg-charbon/5 rounded-lg px-3 py-2">
                    <p className="text-sm">Dr {dest.professionnels?.prenom} {dest.professionnels?.nom} — {libelleSpecialite(dest.professionnels?.specialite)}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STYLES_STATUT_DEST[dest.statut]}`}>{LIBELLES_STATUT_DEST[dest.statut]}</span>
                      {d.statut === 'ouverte' && dest.statut === 'acceptee' && (
                        <button onClick={() => choisirConfrere(d.id, dest.professionnel_id)} disabled={enTraitement === d.id}
                          className="btn-secondaire !py-1 !px-3 text-xs">
                          Continuer avec lui
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {d.statut === 'resolue' && (
                <Link to="/professionnel/messagerie-confreres" className="text-foret text-sm font-semibold mt-3 inline-block">
                  Aller à la messagerie →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {onglet === 'recues' && (
        <div className="space-y-4 mt-6">
          {recues.length === 0 && <p className="text-ardoise text-sm">Aucune demande reçue pour le moment.</p>}
          {recues.map(dest => (
            <div key={dest.id} onClick={() => consulter(dest.demande_id)} className="carte p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <PointNonLu actif={nonLus.has(dest.demande_id)} />
                    Dr {dest.demandes_collaboration?.professionnels?.prenom} {dest.demandes_collaboration?.professionnels?.nom} a besoin de vous
                  </p>
                  <p className="text-xs text-ardoise">
                    {libelleSpecialite(dest.demandes_collaboration?.professionnels?.specialite)} · {dest.demandes_collaboration?.professionnels?.ville} ·
                    {' '}{libelleUrgence(dest.demandes_collaboration?.urgence)}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STYLES_STATUT_DEST[dest.statut]}`}>{LIBELLES_STATUT_DEST[dest.statut]}</span>
              </div>
              <p className="text-sm text-charbon mt-2">{dest.demandes_collaboration?.description}</p>
              {dest.statut === 'en_attente' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => repondre(dest.id, true)} disabled={enTraitement === dest.id} className="btn-secondaire !py-2 !px-4 text-sm">Accepter</button>
                  <button onClick={() => repondre(dest.id, false)} disabled={enTraitement === dest.id} className="btn-fantome !py-2 !px-4 text-sm">Refuser</button>
                </div>
              )}
              {dest.statut === 'acceptee' && dest.demandes_collaboration?.statut === 'resolue' && (
                <div className="mt-2">
                  <p className="text-sm text-foret font-medium">✓ Vous avez été retenu pour cette collaboration.</p>
                  <Link to="/professionnel/messagerie-confreres" className="text-foret text-sm font-semibold mt-1 inline-block">
                    Aller à la messagerie →
                  </Link>
                </div>
              )}
              {dest.statut === 'acceptee' && dest.demandes_collaboration?.statut === 'ouverte' && (
                <p className="text-xs text-ardoise mt-2">En attente du choix final du confrère demandeur.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
