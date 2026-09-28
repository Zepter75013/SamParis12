import { useState } from 'react'
import Logo from './Logo.jsx'

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
          <Logo />
          <span>
            <b>SAM Paris 12</b>
            <span className="tagline">Club de course à pied · 1887</span>
          </span>
        </a>
        <nav className="nav-links" aria-label="Principale">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <a className="btn btn--ghost" href="#adhesion">Espace adhérent</a>
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
      </nav>
    </header>
  )
}
