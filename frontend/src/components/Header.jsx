import { useState } from 'react'
import { Link } from 'react-router-dom'

// Reprend les rubriques du menu du site actuel du club.
const GROUPS = [
  {
    label: 'Le club',
    items: [
      { to: '/le-club', label: 'Qui sommes-nous' },
      { to: '/histoire', label: 'Histoire du club' },
      { to: '/horaires', label: 'Horaires et lieux' },
      { to: '/terrain', label: 'Notre terrain de jeu' },
      { to: '/marche-nordique', label: 'Marche nordique' },
    ],
  },
  {
    label: 'Compétition',
    items: [
      { to: '/nos-courses', label: 'Nos courses' },
      { to: '/nos-resultats', label: 'Nos résultats' },
      { to: '/nos-performances', label: 'Nos performances' },
      { to: '/nous-y-etions', label: 'Nous y étions' },
    ],
  },
]

const DIRECT = [
  { to: '/adhesion', label: 'Adhésion' },
  { to: '/contact', label: 'Contact' },
  { href: 'http://foulees.samparis12.org/', label: 'Les Foulées' },
]

function NavLink({ item, onClick }) {
  return item.href
    ? <a href={item.href} target="_blank" rel="noreferrer" onClick={onClick}>{item.label}</a>
    : <Link to={item.to} onClick={onClick}>{item.label}</Link>
}

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header>
      <div className="shell nav">
        <Link className="brand" to="/">
          <img src="/logo.png" alt="SAM Paris 12" width="42" height="38" />
          <span>
            <b>SAM Paris 12</b>
            <span className="tagline">Club d'athlétisme · 1887</span>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Principale">
          {GROUPS.map((g) => (
            <div className="nav-group" key={g.label}>
              <button type="button" className="nav-group__btn" aria-haspopup="true">{g.label} <span aria-hidden="true">▾</span></button>
              <div className="nav-menu">
                {g.items.map((it) => <Link key={it.to} to={it.to}>{it.label}</Link>)}
              </div>
            </div>
          ))}
          {DIRECT.map((it) => <NavLink key={it.label} item={it} />)}
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
        {GROUPS.map((g) => (
          <div className="drawer-group" key={g.label}>
            <span className="drawer-title">{g.label}</span>
            {g.items.map((it) => (
              <Link key={it.to} to={it.to} onClick={() => setOpen(false)}>{it.label}</Link>
            ))}
          </div>
        ))}
        {DIRECT.map((it) => (
          <NavLink key={it.label} item={it} onClick={() => setOpen(false)} />
        ))}
        <Link to="/espace-adherent" onClick={() => setOpen(false)} className="btn-adherent-nav">
          <span className="dot-status" />
          Espace adhérent →
        </Link>
      </nav>
    </header>
  )
}
