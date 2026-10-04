import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { ord } from './Ord.jsx'

export default function Footer() {
  const { data: partners } = useFetch(() => api.getPartners(), [])
  const partner = partners?.[0]

  return (
    <footer>
      <div className="shell foot">
        <Link to="/espace-adherent">Espace adhérent</Link>
        <a href="http://foulees.samparis12.org/" target="_blank" rel="noreferrer">{ord('Les Foulées du 12ème')}</a>
        <Link to="/contact">Contact</Link>
        <Link to="/a-propos">À propos</Link>
        <span className="sep" />
        {partner && (
          <span className="partner">
            Partenaire
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 22 20H2Z" fill="none" stroke="var(--vermilion)" strokeWidth="2.5" />
            </svg>
            {partner.websiteUrl ? (
              <a href={partner.websiteUrl} target="_blank" rel="noreferrer">{partner.name}</a>
            ) : (
              partner.name
            )}
          </span>
        )}
      </div>
    </footer>
  )
}
