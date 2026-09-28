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
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
      </div>
      <nav className={`shell nav-drawer${open ? ' open' : ''}`} id="drawer" aria-label="Mobile">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
        ))}
        <a href="#contact" onClick={() => setOpen(false)}>Contact</a>
        <Link to="/espace-adherent" onClick={() => setOpen(false)} style={{ color: 'var(--vermilion)' }}>Espace adhérent</Link>
      </nav>
    </header>
  )
}
