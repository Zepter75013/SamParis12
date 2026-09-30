import { Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/adherent/Login.jsx'
import Dashboard from './pages/adherent/Dashboard.jsx'
import Paiement from './pages/Paiement.jsx'
import APropos from './pages/APropos.jsx'

function PublicLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/espace-adherent" element={<Login />} />
      <Route path="/espace-adherent/tableau-de-bord" element={<Dashboard />} />
      <Route path="/adhesion/paiement" element={<Paiement />} />
      <Route path="/a-propos" element={<PublicLayout><APropos /></PublicLayout>} />
      <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
    </Routes>
  )
}
