import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import NavigationMobile from './components/NavigationMobile'
import InitialisationPush from './components/InitialisationPush'
import RouteProtegee from './components/RouteProtegee'

import Accueil from './pages/Accueil'
import Connexion from './pages/Connexion'
import ChoixInscription from './pages/ChoixInscription'
import InscriptionPatient from './pages/InscriptionPatient'
import InscriptionProfessionnel from './pages/InscriptionProfessionnel'
import RechercheProfessionnels from './pages/RechercheProfessionnels'
import FicheProfessionnel from './pages/FicheProfessionnel'
import PrendreRendezVous from './pages/PrendreRendezVous'
import Teleconsultation from './pages/Teleconsultation'
import PageIntrouvable from './pages/PageIntrouvable'

import TableauDeBordPatient from './pages/TableauDeBordPatient'
import RendezVousPatient from './pages/RendezVousPatient'
import DossierMedical from './pages/DossierMedical'
import MesComptesRendus from './pages/MesComptesRendus'

import TableauDeBordProfessionnel from './pages/TableauDeBordProfessionnel'
import RendezVousProfessionnel from './pages/RendezVousProfessionnel'
import FichePatient from './pages/FichePatient'
import ProfilProfessionnel from './pages/ProfilProfessionnel'
import HorairesProfessionnel from './pages/HorairesProfessionnel'
import AbonnementProfessionnel from './pages/AbonnementProfessionnel'
import TrouverExpertise from './pages/TrouverExpertise'
import MesCollaborations from './pages/MesCollaborations'
import MessagerieCollaboration from './pages/MessagerieCollaboration'
import InscriptionLaboratoire from './pages/InscriptionLaboratoire'
import ProfilLaboratoire from './pages/ProfilLaboratoire'
import TableauDeBordLaboratoire from './pages/TableauDeBordLaboratoire'
import RechercheLaboratoires from './pages/RechercheLaboratoires'
import FicheLaboratoire from './pages/FicheLaboratoire'
import DemanderAnalyse from './pages/DemanderAnalyse'
import MessagerieLabo from './pages/MessagerieLabo'
import AbonnementLaboratoire from './pages/AbonnementLaboratoire'
import MesAnalyses from './pages/MesAnalyses'

import TableauDeBordEtablissement from './pages/TableauDeBordEtablissement'
import TableauDeBordAdmin from './pages/TableauDeBordAdmin'
import Messagerie from './pages/Messagerie'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <InitialisationPush />
      <Navbar />
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<ChoixInscription />} />
          <Route path="/inscription/patient" element={<InscriptionPatient />} />
          <Route path="/inscription/professionnel" element={<InscriptionProfessionnel />} />
          <Route path="/recherche" element={<RechercheProfessionnels />} />
          <Route path="/professionnel/:id" element={<FicheProfessionnel />} />
          <Route path="/inscription/laboratoire" element={<InscriptionLaboratoire />} />
          <Route path="/recherche-laboratoires" element={<RechercheLaboratoires />} />
          <Route path="/laboratoire/:id" element={<FicheLaboratoire />} />

          {/* Patient */}
          <Route path="/rendez-vous/prendre/:professionnelId" element={
            <RouteProtegee rolesAutorises={['patient']}><PrendreRendezVous /></RouteProtegee>
          } />
          <Route path="/patient/tableau-de-bord" element={
            <RouteProtegee rolesAutorises={['patient']}><TableauDeBordPatient /></RouteProtegee>
          } />
          <Route path="/patient/rendez-vous" element={
            <RouteProtegee rolesAutorises={['patient']}><RendezVousPatient /></RouteProtegee>
          } />
          <Route path="/patient/dossier-medical" element={
            <RouteProtegee rolesAutorises={['patient']}><DossierMedical /></RouteProtegee>
          } />
          <Route path="/patient/comptes-rendus" element={
            <RouteProtegee rolesAutorises={['patient']}><MesComptesRendus /></RouteProtegee>
          } />
          <Route path="/patient/messagerie" element={
            <RouteProtegee rolesAutorises={['patient']}><Messagerie /></RouteProtegee>
          } />

          {/* Professionnel */}
          <Route path="/professionnel/tableau-de-bord" element={
            <RouteProtegee rolesAutorises={['professionnel']}><TableauDeBordProfessionnel /></RouteProtegee>
          } />
          <Route path="/professionnel/rendez-vous" element={
            <RouteProtegee rolesAutorises={['professionnel']}><RendezVousProfessionnel /></RouteProtegee>
          } />
          <Route path="/professionnel/patient/:id" element={
            <RouteProtegee rolesAutorises={['professionnel']}><FichePatient /></RouteProtegee>
          } />
          <Route path="/professionnel/profil" element={
            <RouteProtegee rolesAutorises={['professionnel']}><ProfilProfessionnel /></RouteProtegee>
          } />
          <Route path="/professionnel/horaires" element={
            <RouteProtegee rolesAutorises={['professionnel']}><HorairesProfessionnel /></RouteProtegee>
          } />
          <Route path="/professionnel/abonnement" element={
            <RouteProtegee rolesAutorises={['professionnel']}><AbonnementProfessionnel /></RouteProtegee>
          } />
          <Route path="/professionnel/messagerie" element={
            <RouteProtegee rolesAutorises={['professionnel']}><Messagerie /></RouteProtegee>
          } />
          <Route path="/professionnel/trouver-expertise" element={
            <RouteProtegee rolesAutorises={['professionnel']}><TrouverExpertise /></RouteProtegee>
          } />
          <Route path="/professionnel/collaborations" element={
            <RouteProtegee rolesAutorises={['professionnel']}><MesCollaborations /></RouteProtegee>
          } />
          <Route path="/professionnel/messagerie-confreres" element={
            <RouteProtegee rolesAutorises={['professionnel']}><MessagerieCollaboration /></RouteProtegee>
          } />

          {/* Laboratoire */}
          <Route path="/laboratoire/demander/:laboId" element={
            <RouteProtegee rolesAutorises={['patient', 'professionnel']}><DemanderAnalyse /></RouteProtegee>
          } />
          <Route path="/laboratoire/tableau-de-bord" element={
            <RouteProtegee rolesAutorises={['laboratoire']}><TableauDeBordLaboratoire /></RouteProtegee>
          } />
          <Route path="/laboratoire/profil" element={
            <RouteProtegee rolesAutorises={['laboratoire']}><ProfilLaboratoire /></RouteProtegee>
          } />
          <Route path="/laboratoire/abonnement" element={
            <RouteProtegee rolesAutorises={['laboratoire']}><AbonnementLaboratoire /></RouteProtegee>
          } />
          <Route path="/laboratoire/messagerie" element={
            <RouteProtegee rolesAutorises={['laboratoire', 'patient', 'professionnel']}><MessagerieLabo /></RouteProtegee>
          } />
          <Route path="/mes-analyses" element={
            <RouteProtegee rolesAutorises={['patient', 'professionnel']}><MesAnalyses /></RouteProtegee>
          } />

          {/* Établissement */}
          <Route path="/etablissement/tableau-de-bord" element={
            <RouteProtegee rolesAutorises={['etablissement']}><TableauDeBordEtablissement /></RouteProtegee>
          } />

          {/* Admin */}
          <Route path="/admin/tableau-de-bord" element={
            <RouteProtegee rolesAutorises={['admin']}><TableauDeBordAdmin /></RouteProtegee>
          } />

          {/* Téléconsultation (patient ou professionnel) */}
          <Route path="/teleconsultation/:rendezVousId" element={
            <RouteProtegee rolesAutorises={['patient', 'professionnel']}><Teleconsultation /></RouteProtegee>
          } />

          <Route path="*" element={<PageIntrouvable />} />
        </Routes>
      </main>
      <Footer />
      <NavigationMobile />
    </div>
  )
}
