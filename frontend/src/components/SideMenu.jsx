// Menu latéral de l'espace adhérent (disposition « Latéral », au choix de l'adhérent) : rubriques regroupées par
// section, une icône par rubrique, pastille des messages non lus. Sur ordinateur, il peut être réduit à une colonne
// d'icônes (préférence gardée dans le navigateur) ; sur téléphone, c'est un tiroir.

// Icônes au trait (24 × 24), dessinées pour le site.
const ICONES = {
  overview: <path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />,
  chat: <path d="M4 5h16v11H9l-4 4v-4H4z" />,
  strava: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  calculateur: <><circle cx="12" cy="13" r="7" /><path d="M12 13V9.5M10 3h4M12 3v3M18 7l1.5-1.5" /></>,
  trombi: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.9-.3 5 1.9 5 5.8" /></>,
  vieduclub: <path d="M5 21V4h12l-2 4 2 4H5" />,
  reseaute: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>,
  documents: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  courses: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  resultats: <path d="M3 21v-6h6v6M9 21V10h6v11M15 21v-8h6v8M2 21h20" />,
  records: <><path d="M8 4h8v6a4 4 0 0 1-8 0z" /><path d="M8 6H4.5v1A3.5 3.5 0 0 0 8 10.5M16 6h3.5v1a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8.5 21h7M10 18h4" /></>,
  aide: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8" /><circle cx="12" cy="16.8" r=".6" fill="currentColor" /></>,
  admin: <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  droitsBureau: <><circle cx="8" cy="15" r="4" /><path d="M11 12 20 3M17 6l3 3M15 8l2 2" /></>,
  stats: <path d="M5 20v-8M11 20V5M17 20v-5M3 20h18" />,
  journal: <><path d="M4 6h11M4 11h8M4 16h5" /><circle cx="17" cy="15" r="4" /><path d="M17 13v2l1.5 1" /></>,
}

const SECTIONS = [
  { titre: 'Mon espace', ids: ['overview', 'chat', 'strava', 'calculateur'] },
  { titre: 'Le club', ids: ['trombi', 'vieduclub', 'reseaute', 'documents'] },
  { titre: 'Compétition', ids: ['courses', 'resultats', 'records'] },
  { titre: 'Bureau', ids: ['admin', 'droitsBureau', 'stats', 'journal'] },
]

function Icone({ id }) {
  return (
    <svg className="side-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONES[id] || <circle cx="12" cy="12" r="8" />}
    </svg>
  )
}

export default function SideMenu({ tabs, activeTab, onSelect, unread, reduit, onToggleReduit, open, onClose }) {
  const parId = Object.fromEntries(tabs.map((t) => [t.id, t]))
  const lien = (t) => (
    <button
      key={t.id}
      type="button"
      className={`side-item${activeTab === t.id ? ' is-active' : ''}`}
      onClick={() => onSelect(t.id)}
      aria-current={activeTab === t.id ? 'page' : undefined}
      title={t.label}
    >
      <Icone id={t.id} />
      <span className="side-label">{t.label}</span>
      {t.id === 'chat' && unread > 0 && (
        <span className="side-badge" aria-label={`${unread} message${unread > 1 ? 's' : ''} à lire`}>{unread > 99 ? '99+' : unread}</span>
      )}
    </button>
  )
  const rangees = new Set(SECTIONS.flatMap((s) => s.ids))
  const autres = tabs.filter((t) => !rangees.has(t.id) && t.id !== 'aide')

  return (
    <>
      {open && <div className="adh-side-backdrop" onClick={onClose} />}
      <aside className={`adh-side side${open ? ' is-open' : ''}${reduit ? ' is-reduit' : ''}`} aria-label="Menu de l'espace adhérent">
        <div className="side-tete">
          <span>Menu</span>
          <button type="button" className="side-fermer" onClick={onClose} aria-label="Fermer le menu">✕</button>
        </div>
        <nav className="side-nav">
          {SECTIONS.map((s) => {
            const items = s.ids.filter((id) => parId[id]).map((id) => parId[id])
            if (items.length === 0) return null
            return (
              <div className="side-section" key={s.titre}>
                <span className="side-titre">{s.titre}</span>
                {items.map(lien)}
              </div>
            )
          })}
          {autres.length > 0 && <div className="side-section">{autres.map(lien)}</div>}
        </nav>
        <div className="side-pied">
          {parId.aide && lien(parId.aide)}
          <button type="button" className="side-reduire" onClick={onToggleReduit} aria-label={reduit ? 'Déplier le menu' : 'Réduire le menu'} title={reduit ? 'Déplier le menu' : 'Réduire le menu'}>
            <svg className="side-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={reduit ? 'm10 6 6 6-6 6' : 'm14 6-6 6 6 6'} />
            </svg>
          </button>
        </div>
      </aside>
    </>
  )
}
