import { Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Club from './pages/Club.jsx'
import Groups from './pages/Groups.jsx'
import News from './pages/News.jsx'
import NewsArticle from './pages/NewsArticle.jsx'
import Events from './pages/Events.jsx'
import Partners from './pages/Partners.jsx'
import Contact from './pages/Contact.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/club" element={<Club />} />
          <Route path="/sections" element={<Groups />} />
          <Route path="/actualites" element={<News />} />
          <Route path="/actualites/:slug" element={<NewsArticle />} />
          <Route path="/calendrier" element={<Events />} />
          <Route path="/partenaires" element={<Partners />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
