import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/club', label: 'Le club' },
  { to: '/sections', label: 'Sections' },
  { to: '/actualites', label: 'Actualités' },
  { to: '/calendrier', label: 'Calendrier' },
  { to: '/partenaires', label: 'Partenaires' },
  { to: '/contact', label: 'Contact' },
]

function navClass({ isActive }) {
  return [
    'px-3 py-2 rounded-md text-sm font-semibold transition-colors',
    isActive
      ? 'text-club-red bg-red-50'
      : 'text-gray-700 hover:text-club-red hover:bg-red-50',
  ].join(' ')
}

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
            <Logo className="h-9 w-9" />
            <span className="font-display text-2xl leading-none tracking-wide">
              SAM PARIS 12
            </span>
          </NavLink>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
            aria-expanded={open}
            aria-label="Ouvrir le menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={navClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
