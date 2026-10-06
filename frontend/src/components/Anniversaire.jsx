// Décor d'anniversaire du trombinoscope : gâteau, bouteille et flûte de champagne dessinés en SVG, avec un petit feu d'artifice.
// Les animations (flammes, bulles, bouchon, étincelles) sont en CSS et s'arrêtent si l'appareil demande moins de mouvement.

function Gateau() {
  return (
    <svg viewBox="0 0 64 72" className="anniv-svg" aria-hidden="true">
      <ellipse cx="32" cy="64" rx="28" ry="5" fill="#d9d2c8" />
      <rect x="6" y="42" width="52" height="20" rx="4" fill="#c98250" />
      <path d="M6 46 q5 7 10 0 q5 7 10 0 q5 7 10 0 q5 7 10 0 q5 7 12 0 v-6 a4 4 0 0 0 -4 -4 h-44 a4 4 0 0 0 -4 4z" fill="#fff6ea" />
      <rect x="14" y="24" width="36" height="18" rx="4" fill="#e8656f" />
      <path d="M14 28 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 6 0 v-3 a4 4 0 0 0 -4 -4 h-26 a4 4 0 0 0 -4 4z" fill="#fff6ea" />
      <circle cx="21" cy="52" r="2" fill="#fff6ea" /><circle cx="32" cy="54" r="2" fill="#fff6ea" /><circle cx="43" cy="52" r="2" fill="#fff6ea" />
      {[22, 32, 42].map((x, i) => (
        <g key={x}>
          <rect x={x - 1.6} y="11" width="3.2" height="11" rx="1" fill="#fff" stroke="#de3327" strokeWidth="0.8" />
          <path className="anniv-flamme" style={{ animationDelay: `${i * 0.25}s` }} d={`M${x} 3 q3.2 4 0 8 q-3.2 -4 0 -8z`} fill="#ffb627" />
        </g>
      ))}
    </svg>
  )
}

function Bouteille() {
  return (
    <svg viewBox="0 0 40 80" className="anniv-svg anniv-svg--bouteille" aria-hidden="true">
      <g className="anniv-bouchon"><rect x="16" y="2" width="8" height="9" rx="2" fill="#e8c9a0" /><rect x="16" y="2" width="8" height="2.4" rx="1" fill="#c9a06a" /></g>
      <path d="M15 11 h10 v6 h-10z" fill="#d9a62b" />
      <path d="M15 17 h10 l1 12 c0 6 8 10 8 20 v26 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 v-26 c0 -10 8 -14 8 -20z" fill="#1f5e3b" />
      <path d="M14 29 h12 l-1 -12 h-10z" fill="#d9a62b" opacity="0.9" />
      <rect x="9" y="50" width="22" height="16" rx="2" fill="#fff6ea" />
      <path d="M20 53.5 l1.6 3.2 3.5 .5 -2.5 2.4 .6 3.5 -3.2 -1.7 -3.2 1.7 .6 -3.5 -2.5 -2.4 3.5 -.5z" fill="#de3327" />
      <path d="M12 36 c0 -3 3 -5 5 -7 v38" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <circle className="anniv-mousse" cx="14" cy="6" r="1.6" fill="#fff" /><circle className="anniv-mousse anniv-mousse--2" cx="27" cy="4" r="1.2" fill="#fff" />
    </svg>
  )
}

function Flute() {
  return (
    <svg viewBox="0 0 32 80" className="anniv-svg" aria-hidden="true">
      <defs>
        <linearGradient id="anniv-champ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e08a" /><stop offset="1" stopColor="#e2b33c" />
        </linearGradient>
      </defs>
      <path d="M8 6 h16 l-1 34 c-.3 7 -3.4 11 -7 11 s-6.7 -4 -7 -11z" fill="#dff1f6" fillOpacity="0.55" stroke="#8fb9c6" strokeWidth="1.4" />
      <path d="M9.2 16 h13.6 l-.8 24 c-.3 6 -2.8 9.5 -6 9.5 s-5.7 -3.5 -6 -9.5z" fill="url(#anniv-champ)" />
      <rect x="15" y="50" width="2" height="21" fill="#8fb9c6" />
      <ellipse cx="16" cy="73" rx="9" ry="3" fill="#dff1f6" fillOpacity="0.7" stroke="#8fb9c6" strokeWidth="1.4" />
      {[[13, 0], [18, 0.6], [15.5, 1.2], [12, 1.8], [19, 2.2]].map(([x, d], i) => (
        <circle key={i} className="anniv-bulle" style={{ animationDelay: `${d}s` }} cx={x} cy="44" r="1.1" fill="#fff" />
      ))}
    </svg>
  )
}

// Rafales de feu d'artifice : chaque rafale est un cercle de petits traits qui s'éloignent du centre puis s'éteignent.
const RAFALES = [
  { x: '14%', y: '22%', c: '#de3327', d: '0s' },
  { x: '86%', y: '18%', c: '#f2b01e', d: '1.1s' },
  { x: '50%', y: '10%', c: '#3b6fb6', d: '2.1s' },
  { x: '28%', y: '34%', c: '#2f9e6b', d: '2.9s' },
  { x: '74%', y: '32%', c: '#d9568f', d: '0.6s' },
]

export function FeuArtifice() {
  return (
    <div className="feu" aria-hidden="true">
      {RAFALES.map((r, i) => (
        <span key={i} className="feu__rafale" style={{ left: r.x, top: r.y, '--c': r.c, '--d': r.d }}>
          {Array.from({ length: 12 }, (_, k) => <i key={k} style={{ '--a': `${k * 30}deg` }} />)}
        </span>
      ))}
    </div>
  )
}

// Gâteau, bouteille et flûte côte à côte
export function DecorAnniversaire({ grand = false }) {
  return (
    <div className={`anniv-decor${grand ? ' anniv-decor--grand' : ''}`} aria-hidden="true">
      <Gateau /><Bouteille /><Flute />
    </div>
  )
}
