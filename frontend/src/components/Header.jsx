import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BORNES } from '../data/rubriques.js'

// Le menu suit exactement les bornes de l'accueil : même ordre, mêmes intitulés, même numéro de km.
const item = (b, i) => ({ to: b.to, label: b.theme, n: i + 1 })
const ITEMS = BORNES.map(item)

// Ordre du menu = ordre des bornes (1-5 le club, 6 adhésion, 7-10 compétition, 11 contact).
const MENU = [
  { group: 'Le club', items: ITEMS.slice(0, 5) },
  { ...ITEMS[5], label: 'Adhésion' },
  { group: 'Compétition', items: ITEMS.slice(6, 10) },
  { ...ITEMS[10], label: 'Contact' },
  { href: 'http://foulees.samparis12.org/', label: 'Les Foulées' },
]

function MenuLink({ it, onClick }) {
  return (
    <Link to={it.to} onClick={onClick}>
      <b className="menu-km">{String(it.n).padStart(2, '0')}</b>{it.label}
    </Link>
  )
}

function NavLink({ item: it, onClick }) {
  return it.href
    ? <a href={it.href} target="_blank" rel="noreferrer" onClick={onClick}>{it.label}</a>
    : <Link to={it.to} title={`Km ${it.n}`} onClick={onClick}>{it.label}</Link>
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
          {MENU.map((m) => (m.group ? (
            <div className="nav-group" key={m.group}>
              <button type="button" className="nav-group__btn" aria-haspopup="true">{m.group} <span aria-hidden="true">▾</span></button>
              <div className="nav-menu">
                {m.items.map((it) => <MenuLink key={it.to} it={it} />)}
              </div>
            </div>
          ) : <NavLink key={m.label} item={m} />))}
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
        {MENU.map((m) => (m.group ? (
          <div className="drawer-group" key={m.group}>
            <span className="drawer-title">{m.group}</span>
            {m.items.map((it) => (
              <MenuLink key={it.to} it={it} onClick={() => setOpen(false)} />
            ))}
          </div>
        ) : <NavLink key={m.label} item={m} onClick={() => setOpen(false)} />))}
        <Link to="/espace-adherent" onClick={() => setOpen(false)} className="btn-adherent-nav">
          <span className="dot-status" />
          Espace adhérent →
        </Link>
      </nav>
    </header>
  )
}
