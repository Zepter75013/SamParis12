import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

export default function Footer() {
  return (
    <footer className="bg-club-ink text-gray-300 mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-xl text-white tracking-wide">SAM PARIS 12</span>
          </div>
          <p className="mt-3 text-sm text-gray-400">Club d'athlétisme</p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Le club</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/club" className="hover:text-white">Présentation</Link></li>
            <li><Link to="/sections" className="hover:text-white">Sections & entraînements</Link></li>
            <li><Link to="/partenaires" className="hover:text-white">Partenaires</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Suivre le club</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/actualites" className="hover:text-white">Actualités</Link></li>
            <li><Link to="/calendrier" className="hover:text-white">Calendrier des compétitions</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Contact</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>Paris 12e arrondissement</li>
            <li><Link to="/contact" className="hover:text-white">Formulaire de contact</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SAM Paris 12. Tous droits réservés.
      </div>
    </footer>
  )
}
