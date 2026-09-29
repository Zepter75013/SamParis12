import { useState } from 'react'
import { Link } from 'react-router-dom'

const LINKS = [
  { href: '#club', label: 'Le club' },
  { href: '#disciplines', label: 'Disciplines' },
  { href: '#terrain', label: 'Terrain de jeu' },
  { href: '#foulees', label: 'Les Foulées' },
  { href: '#adhesion', label: 'Adhésion' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header>
      <div className="shell nav">
        <a className="brand" href="#top">
          <img src="/logo.png" alt="SAM Paris 12" width="42" height="38" />
          <span>
            <b>SAM Paris 12</b>
            <span className="tagline">Club d'athlétisme · 1887</span>
          </span>
        </a>
        <nav className="nav-links" aria-label="Principale">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <Link to="/espace-adherent" className="btn-adherent-nav">
            <span className="dot-status" />
            Espace adhérent →
          </Link>
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="drawer"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {open ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </>
            ) : (
              <>
                <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="2" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>
      {open && <div className="nav-backdrop open" onClick={() => setOpen(false)} />}
      <nav className={`nav-drawer${open ? ' open' : ''}`} id="drawer" aria-label="Mobile">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
        ))}
        <a href="#contact" onClick={() => setOpen(false)}>Contact</a>
        <Link to="/espace-adherent" onClick={() => setOpen(false)} className="btn-adherent-nav">
          <span className="dot-status" />
          Espace adhérent →
        </Link>
      </nav>
    </header>
  )
}
