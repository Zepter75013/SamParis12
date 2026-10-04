import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import EasterEgg from './components/EasterEgg.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/adherent/Login.jsx'
import Dashboard from './pages/adherent/Dashboard.jsx'
import Paiement from './pages/Paiement.jsx'
import APropos from './pages/APropos.jsx'
import {
  HistoirePage, HorairesPage, MarcheNordiquePage, LeClubPage,
  NosCoursesPage, NosResultatsPage, NosPerformancesPage,
  TerrainPage, AdhesionPage, ContactPage, NousYetionsPage,
} from './pages/Content.jsx'

function PublicLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}

// Les liens du menu pointent vers des ancres de l'accueil (/#terrain…) et vers
// des pages : on défile vers l'ancre si elle existe, sinon on remonte en haut.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <EasterEgg />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/le-club" element={<PublicLayout><LeClubPage /></PublicLayout>} />
        <Route path="/histoire" element={<PublicLayout><HistoirePage /></PublicLayout>} />
        <Route path="/horaires" element={<PublicLayout><HorairesPage /></PublicLayout>} />
        <Route path="/marche-nordique" element={<PublicLayout><MarcheNordiquePage /></PublicLayout>} />
        <Route path="/terrain" element={<PublicLayout><TerrainPage /></PublicLayout>} />
        <Route path="/adhesion" element={<PublicLayout><AdhesionPage /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
        <Route path="/nous-y-etions" element={<PublicLayout><NousYetionsPage /></PublicLayout>} />
        <Route path="/nos-courses" element={<PublicLayout><NosCoursesPage /></PublicLayout>} />
        <Route path="/nos-resultats" element={<PublicLayout><NosResultatsPage /></PublicLayout>} />
        <Route path="/nos-performances" element={<PublicLayout><NosPerformancesPage /></PublicLayout>} />
        <Route path="/espace-adherent" element={<Login />} />
        <Route path="/espace-adherent/tableau-de-bord" element={<Dashboard />} />
        <Route path="/adhesion/paiement" element={<Paiement />} />
        <Route path="/a-propos" element={<PublicLayout><APropos /></PublicLayout>} />
        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </>
  )
}
