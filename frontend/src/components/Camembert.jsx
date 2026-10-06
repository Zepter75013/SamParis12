// Camembert en 3D (SVG) : disque incliné avec épaisseur, légende à côté. Pas de bibliothèque : l'épaisseur est obtenue en
// empilant les tranches décalées vers le bas dans une teinte assombrie, puis en dessinant le dessus par-dessus.

const PALETTE = ['#DE3327', '#1C1917', '#E9A23B', '#2F7D6D', '#5A4FD6', '#8B6B4A', '#D97B6F', '#9C9288']

const nf = new Intl.NumberFormat('fr-FR')

function assombrir(hex, k = 0.6) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v) => Math.round(v * k).toString(16).padStart(2, '0')
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}

const W = 300
const H = 190
const CX = 150
const CY = 80
const RX = 120
const RY = 62
const EPAISSEUR = 18

// Tranche entre deux angles (radians, 0 = haut, sens horaire) ; une tranche de 100 % est une ellipse entière.
function chemin(a0, a1, dy) {
  const pt = (a) => `${(CX + RX * Math.sin(a)).toFixed(2)} ${(CY + dy - RY * Math.cos(a)).toFixed(2)}`
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    return `M ${CX - RX} ${CY + dy} A ${RX} ${RY} 0 1 0 ${CX + RX} ${CY + dy} A ${RX} ${RY} 0 1 0 ${CX - RX} ${CY + dy} Z`
  }
  return `M ${CX} ${CY + dy} L ${pt(a0)} A ${RX} ${RY} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)} Z`
}

// data : [{ label, n }] ; au-delà de max tranches, les plus petites sont regroupées dans « Autres ».
export default function Camembert({ data, titre, max = 7, vide = 'Aucune donnée.', large = false }) {
  let parts = data.filter((d) => d.n > 0)
  if (parts.length > max) {
    const tri = [...parts].sort((a, b) => b.n - a.n)
    const autres = tri.slice(max - 1).reduce((s, d) => s + d.n, 0)
    const gardes = new Set(tri.slice(0, max - 1).map((d) => d.label))
    parts = [...parts.filter((d) => gardes.has(d.label)), { label: 'Autres', n: autres }]
  }
  const total = parts.reduce((s, d) => s + d.n, 0)

  let cumul = 0
  const tranches = parts.map((d, i) => {
    const a0 = (cumul / total) * Math.PI * 2
    cumul += d.n
    return { ...d, a0, a1: (cumul / total) * Math.PI * 2, couleur: PALETTE[i % PALETTE.length], pct: Math.round((d.n / total) * 100) }
  })

  return (
    <section className={`stats-bloc${large ? ' stats-bloc--large' : ''}`}>
      {titre && <h3>{titre}</h3>}
      {total === 0 ? <p className="stats-vide">{vide}</p> : (
        <div className="camembert">
          <svg viewBox={`0 0 ${W} ${H}`} className="camembert__svg" role="img" aria-label={titre}>
            <ellipse cx={CX} cy={CY + EPAISSEUR + RY + 2} rx={RX * 0.9} ry={6} className="camembert__ombre" />
            <g>
              {Array.from({ length: EPAISSEUR }, (_, k) => EPAISSEUR - k).map((dy) => (
                <g key={dy}>
                  {tranches.map((t) => <path key={t.label} d={chemin(t.a0, t.a1, dy)} fill={assombrir(t.couleur)} />)}
                </g>
              ))}
            </g>
            {tranches.map((t) => (
              <path key={t.label} d={chemin(t.a0, t.a1, 0)} fill={t.couleur} className="camembert__part">
                <title>{`${t.label} : ${nf.format(t.n)} (${t.pct} %)`}</title>
              </path>
            ))}
          </svg>
          <ul className="camembert__legende">
            {tranches.map((t) => (
              <li key={t.label}>
                <i style={{ background: t.couleur }} aria-hidden="true" />
                <span title={t.label}>{t.label}</span>
                <b>{nf.format(t.n)}</b>
                <small>{t.pct} %</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
