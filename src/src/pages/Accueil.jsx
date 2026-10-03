import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CalendarCheck, Stethoscope, ShieldCheck, HeartPulse, Video } from 'lucide-react'
import { SPECIALITES_LISTE, VILLES_CI } from '../lib/constantes'
import { useAuth } from '../context/AuthContext'
import SelectAvecAutre from '../components/SelectAvecAutre'

const ETAPES = [
  { Icone: Search, titre: 'Cherchez', texte: 'Filtrez par spécialité, ville ou langue parlée pour trouver le bon professionnel.' },
  { Icone: CalendarCheck, titre: 'Réservez', texte: 'Choisissez la date, l\'heure et le mode de consultation qui vous conviennent.' },
  { Icone: Stethoscope, titre: 'Consultez', texte: 'Rendez-vous au cabinet ou connectez-vous à votre téléconsultation, en toute sécurité.' },
]

export default function Accueil() {
  const navigate = useNavigate()
  const { utilisateur, role } = useAuth()
  const [specialite, setSpecialite] = useState('')
  const [ville, setVille] = useState('')
  const estProOuLabo = role === 'professionnel' || role === 'laboratoire'

  const lancerRecherche = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (specialite) params.set('specialite', specialite)
    if (ville) params.set('ville', ville)
    navigate(`/recherche?${params.toString()}`)
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-2 motif-tisse" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-wide uppercase text-foret bg-foret-light px-3 py-1 rounded-full">
              Fait pour la Côte d'Ivoire
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-charbon mt-4 leading-[1.08]">
              La santé, à portée de main —
              <span className="text-ambre"> au cabinet</span> ou
              <span className="text-foret"> en ligne</span>.
            </h1>
            <p className="text-ardoise mt-5 text-lg max-w-lg">
              Santé-CI met en relation les patients ivoiriens avec des médecins, dentistes,
              sages-femmes, kinésithérapeutes et autres professionnels de santé vérifiés.
              Inscription patient 100% gratuite.
            </p>

            {estProOuLabo ? (
              <a href={role === 'laboratoire' ? '/laboratoire/tableau-de-bord' : '/professionnel/tableau-de-bord'} className="btn-primaire mt-8 inline-flex">
                Aller à mon tableau de bord
              </a>
            ) : (
              <form onSubmit={lancerRecherche} className="mt-8 carte p-3 flex flex-col sm:flex-row gap-2">
                <div className="sm:flex-1"><SelectAvecAutre className="champ !border-0" optionVide="Toutes les spécialités" options={SPECIALITES_LISTE} value={specialite}
                  onChange={setSpecialite} placeholderAutre="Précisez la spécialité" /></div>
                <div className="sm:w-44"><SelectAvecAutre className="champ !border-0" optionVide="Toutes les villes" options={VILLES_CI} value={ville}
                  onChange={setVille} placeholderAutre="Précisez la ville" /></div>
                <button type="submit" className="btn-primaire shrink-0">Rechercher</button>
              </form>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-sm text-ardoise">
              <p className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-foret" /> Professionnels vérifiés</p>
              <p className="flex items-center gap-1.5"><HeartPulse size={16} className="text-ambre" /> Données médicales chiffrées</p>
              <p className="flex items-center gap-1.5"><Video size={16} className="text-foret" /> Téléconsultation intégrée</p>
            </div>
          </div>

          {!utilisateur && (
            <div className="relative hidden lg:block">
              <div className="carte p-6 max-w-sm ml-auto">
                <p className="text-xs uppercase tracking-wide text-ardoise font-semibold">Prochain rendez-vous</p>
                <p className="font-display font-semibold text-lg mt-2">Dr Aïcha Koffi</p>
                <p className="text-sm text-ardoise">Médecin généraliste — Cocody, Abidjan</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-ligne">
                  <div>
                    <p className="text-sm text-ardoise">Jeudi 16 juillet</p>
                    <p className="font-donnee font-semibold">10:30</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-ambre-light text-ambre-dark font-semibold">Téléconsultation</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-xl2 motif-tisse -z-10" />
            </div>
          )}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-charbon mb-10">Comment ça marche</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {ETAPES.map(e => (
            <div key={e.titre} className="carte p-6">
              <div className="w-10 h-10 rounded-full bg-foret text-white flex items-center justify-center mb-4">
                <e.Icone size={18} />
              </div>
              <p className="font-display font-semibold text-lg">{e.titre}</p>
              <p className="text-ardoise text-sm mt-2">{e.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* POUR LES PROFESSIONNELS */}
      {!estProOuLabo && (
      <section className="bg-foret-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-charbon">
              Vous êtes professionnel de santé ?
            </h2>
            <p className="text-ardoise mt-3 max-w-md">
              Gérez votre agenda, vos téléconsultations et votre patientèle depuis un seul espace.
              1 mois d'essai gratuit, aucune commission sur vos consultations.
            </p>
            <a href="/inscription/professionnel" className="btn-secondaire mt-6">Créer mon espace professionnel</a>
          </div>
          <ul className="space-y-3">
            {[
              'Fiche professionnelle vérifiée et visible dans les recherches',
              'Consultations physiques et/ou téléconsultation, à votre convenance',
              'Vous choisissez vos propres moyens de paiement',
              'Dossiers médicaux, ordonnances et messagerie sécurisée intégrés',
            ].map(t => (
              <li key={t} className="flex gap-3 items-start">
                <span className="mt-1 w-5 h-5 rounded-full bg-foret text-white text-xs flex items-center justify-center shrink-0">✓</span>
                <span className="text-charbon">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}
    </div>
  )
}
