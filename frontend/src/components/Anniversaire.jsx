import { useEffect, useId, useRef } from 'react'

// Scène d'anniversaire du trombinoscope : un ciel de nuit avec un vrai feu d'artifice (fusées, explosions, étincelles qui
// retombent, traînées lumineuses, dessiné sur un canvas) au-dessus d'un gâteau, d'une bouteille et d'une flûte de champagne
// dessinés en SVG (dégradés, reflets, mousse, bulles). L'animation ne tourne que lorsque la scène est visible à l'écran et
// s'arrête si l'appareil demande moins de mouvement.

// ---------------------------------------------------------------------------------------------------------------------
// Feu d'artifice (canvas)
// ---------------------------------------------------------------------------------------------------------------------

const TEINTES = [4, 38, 48, 120, 165, 200, 268, 320] // rouge, orange, or, vert, turquoise, bleu, violet, rose

function demarrerFeu(canvas) {
  const ctx = canvas.getContext('2d')
  let w = 0
  let h = 0
  let echelle = 1
  const redim = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(1.5, window.devicePixelRatio || 1) // plusieurs scènes peuvent tourner en même temps : on limite la définition
    w = r.width
    h = r.height
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    echelle = Math.max(0.6, Math.min(w, h) / 160) // les gerbes s'adaptent à la taille de la scène
  }
  redim()
  const observeur = new ResizeObserver(redim)
  observeur.observe(canvas)

  const fusees = []
  const etincelles = []
  let prochain = 0
  let dernier = 0
  let raf = 0
  let visible = true

  const lancer = () => {
    const teinte = TEINTES[Math.floor(Math.random() * TEINTES.length)]
    fusees.push({
      x: w * (0.12 + Math.random() * 0.76), y: h * 0.78, vx: (Math.random() - 0.5) * 0.35 * echelle, vy: -(2.6 + Math.random() * 1.1) * echelle,
      cible: h * (0.2 + Math.random() * 0.28), teinte,
    })
  }

  const exploser = (f) => {
    const forme = Math.random()
    const n = Math.round((forme < 0.3 ? 46 : 64) * Math.min(1.4, echelle))
    const base = forme < 0.3 ? 2.1 : 0.5 // « anneau » : toutes les étincelles à la même vitesse ; « sphère » : vitesses variées
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.2
      const v = (forme < 0.3 ? base : base + Math.random() * 2.2) * echelle
      etincelles.push({
        x: f.x, y: f.y, px: f.x, py: f.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
        vie: 1, usure: 0.011 + Math.random() * 0.012, teinte: f.teinte + (Math.random() - 0.5) * 24,
        taille: 0.9 + Math.random() * 0.9, paillette: Math.random() < 0.3, saule: forme > 0.8,
      })
    }
    // éclair central
    etincelles.push({ x: f.x, y: f.y, px: f.x, py: f.y, vx: 0, vy: 0, vie: 1, usure: 0.09, teinte: f.teinte, taille: 11 * echelle, eclair: true })
    // petite seconde gerbe, décalée, au cœur de la première
    if (Math.random() < 0.45) {
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2
        const v = (0.3 + Math.random() * 0.9) * echelle
        etincelles.push({ x: f.x, y: f.y, px: f.x, py: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vie: 1, usure: 0.02, teinte: 45, taille: 1.1, paillette: true })
      }
    }
  }

  const image = (t) => {
    raf = requestAnimationFrame(image)
    if (!visible || document.hidden) { dernier = t; return }
    const dt = Math.min(2.2, (t - dernier) / 16.7 || 1)
    dernier = t

    // fondu des traînées sur fond transparent
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = `rgba(0,0,0,${0.2 * dt})`
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'lighter'

    if (t > prochain) {
      lancer()
      prochain = t + 700 + Math.random() * 1100
    }

    for (let i = fusees.length - 1; i >= 0; i--) {
      const f = fusees[i]
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vy += 0.012 * echelle * dt
      ctx.strokeStyle = `hsla(${f.teinte},100%,80%,0.9)`
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(f.x - f.vx * 5, f.y - f.vy * 5)
      ctx.lineTo(f.x, f.y)
      ctx.stroke()
      if (f.y <= f.cible || f.vy > -0.4) { exploser(f); fusees.splice(i, 1) }
    }

    for (let i = etincelles.length - 1; i >= 0; i--) {
      const e = etincelles[i]
      e.vie -= e.usure * dt
      if (e.vie <= 0) { etincelles.splice(i, 1); continue }
      if (e.eclair) {
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.taille * (2 - e.vie))
        g.addColorStop(0, `hsla(${e.teinte},100%,95%,${e.vie})`)
        g.addColorStop(1, `hsla(${e.teinte},100%,60%,0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.taille * (2 - e.vie), 0, Math.PI * 2)
        ctx.fill()
        continue
      }
      e.px = e.x
      e.py = e.y
      const frottement = Math.pow(e.saule ? 0.972 : 0.985, dt)
      e.vx *= frottement
      e.vy = e.vy * frottement + (e.saule ? 0.05 : 0.035) * echelle * dt
      e.x += e.vx * dt
      e.y += e.vy * dt
      let alpha = Math.pow(e.vie, 1.4)
      if (e.paillette && e.vie < 0.55) alpha *= 0.4 + Math.random() * 0.9 // scintillement
      const clair = 55 + 35 * e.vie
      ctx.strokeStyle = `hsla(${e.teinte},100%,${clair}%,${alpha})`
      ctx.lineWidth = e.taille
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(e.px, e.py)
      ctx.lineTo(e.x, e.y)
      ctx.stroke()
      ctx.fillStyle = `hsla(${e.teinte},100%,70%,${alpha * 0.22})` // halo
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.taille * 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  raf = requestAnimationFrame(image)

  const visibilite = new IntersectionObserver(([entree]) => { visible = entree.isIntersecting }, { threshold: 0.05 })
  visibilite.observe(canvas)

  return () => {
    cancelAnimationFrame(raf)
    observeur.disconnect()
    visibilite.disconnect()
  }
}

function FeuArtifice() {
  const ref = useRef(null)
  useEffect(() => {
    const reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduit || !ref.current) return undefined
    return demarrerFeu(ref.current)
  }, [])
  return <canvas ref={ref} className="anniv-feu" aria-hidden="true" />
}

// ---------------------------------------------------------------------------------------------------------------------
// Illustrations (SVG)
// ---------------------------------------------------------------------------------------------------------------------

function Gateau({ id }) {
  const g = (n) => `${id}-${n}`
  return (
    <svg viewBox="0 0 120 138" className="anniv-svg anniv-svg--gateau" aria-hidden="true">
      <defs>
        <linearGradient id={g('choc')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a4a2a" /><stop offset="1" stopColor="#4d2412" /></linearGradient>
        <linearGradient id={g('fram')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f58aa6" /><stop offset="1" stopColor="#cf3f6c" /></linearGradient>
        <linearGradient id={g('van')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3de" /><stop offset="1" stopColor="#f1d3a3" /></linearGradient>
        <linearGradient id={g('creme')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f6e6cf" /></linearGradient>
        <linearGradient id={g('plat')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9aa3b5" /><stop offset="0.5" stopColor="#f4f6fb" /><stop offset="1" stopColor="#8d96a8" /></linearGradient>
        <radialGradient id={g('lueur')} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffe9a6" stopOpacity="0.95" /><stop offset="1" stopColor="#ffb627" stopOpacity="0" /></radialGradient>
        <radialGradient id={g('cerise')} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ff6b6b" /><stop offset="1" stopColor="#a50f20" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="130" rx="56" ry="7" fill={`url(#${g('plat')})`} />
      <ellipse cx="60" cy="127" rx="50" ry="5" fill="#ffffff" fillOpacity="0.35" />
      {/* étage du bas */}
      <rect x="10" y="88" width="100" height="38" rx="7" fill={`url(#${g('choc')})`} />
      <path d="M10 95 q0-8 8-8 h84 q8 0 8 8 q-4 12 -9 3 q-4 12 -9 2 q-4 13 -9 2 q-4 11 -9 3 q-4 13 -9 2 q-4 12 -9 2 q-4 12 -9 3 q-4 11 -9 3 q-4 11 -9 3 q-4 10 -11 0z" fill={`url(#${g('creme')})`} />
      {[18, 30, 42, 54, 66, 78, 90, 102].map((x) => <circle key={x} cx={x} cy="122" r="3.4" fill={`url(#${g('creme')})`} />)}
      <rect x="10" y="88" width="9" height="38" rx="4" fill="#fff" fillOpacity="0.12" />
      {/* étage du milieu */}
      <rect x="24" y="58" width="72" height="34" rx="7" fill={`url(#${g('fram')})`} />
      <path d="M24 65 q0-8 8-8 h56 q8 0 8 8 q-3 11 -8 3 q-4 11 -9 2 q-4 12 -9 2 q-4 11 -9 3 q-4 12 -9 2 q-4 11 -9 2 q-4 10 -11 -1z" fill={`url(#${g('creme')})`} />
      <rect x="24" y="58" width="8" height="34" rx="4" fill="#fff" fillOpacity="0.16" />
      {/* étage du haut */}
      <rect x="38" y="34" width="44" height="28" rx="6" fill={`url(#${g('van')})`} />
      <path d="M38 41 q0-7 7-7 h30 q7 0 7 7 q-3 9 -7 3 q-4 9 -8 2 q-4 10 -8 2 q-4 9 -8 2 q-4 8 -8 3 q-4 -2 -5 -5z" fill="#ffffff" />
      {/* cerises, nappage et vermicelles */}
      <circle cx="49" cy="34" r="4.6" fill={`url(#${g('cerise')})`} /><circle cx="71" cy="34" r="4.6" fill={`url(#${g('cerise')})`} />
      <path d="M49 30 q2-5 6-6 M71 30 q-2-5 -6-6" stroke="#2f7d3a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {[[30, 108, '#ffd23f'], [46, 112, '#3bb3ff'], [62, 106, '#ff6fa5'], [80, 111, '#7ee081'], [96, 106, '#ffd23f'], [38, 78, '#ffffff'], [58, 82, '#ffe29a'], [78, 76, '#ffffff'], [88, 84, '#ffe29a']].map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="5" height="1.8" rx="0.9" fill={c} transform={`rotate(${(i * 47) % 180} ${x + 2.5} ${y + 1})`} />
      ))}
      {/* bougies */}
      {[48, 60, 72].map((x, i) => (
        <g key={x}>
          <circle className="anniv-lueur" style={{ animationDelay: `${i * 0.3}s` }} cx={x} cy="14" r="13" fill={`url(#${g('lueur')})`} />
          <rect x={x - 2.3} y="16" width="4.6" height="20" rx="1.4" fill="#fff" stroke="#e0e6f0" strokeWidth="0.5" />
          <path d={`M${x - 2.3} 22 l4.6 -3 M${x - 2.3} 28 l4.6 -3 M${x - 2.3} 34 l4.6 -3`} stroke={['#e8374f', '#2f7be0', '#e8374f'][i]} strokeWidth="1.5" />
          <path className="anniv-flamme" style={{ animationDelay: `${i * 0.22}s` }} d={`M${x} 3 q4.2 5.4 0 10.4 q-4.2 -5 0 -10.4z`} fill="#ffb627" />
          <path className="anniv-flamme" style={{ animationDelay: `${i * 0.22 + 0.1}s` }} d={`M${x} 7 q2 3 0 6 q-2 -3 0 -6z`} fill="#fff6c9" />
        </g>
      ))}
    </svg>
  )
}

function Bouteille({ id }) {
  const g = (n) => `${id}-${n}`
  return (
    <svg viewBox="0 0 70 170" className="anniv-svg anniv-svg--bouteille" aria-hidden="true">
      <defs>
        <linearGradient id={g('verre')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#06231a" /><stop offset="0.28" stopColor="#1f7a4c" /><stop offset="0.45" stopColor="#12553a" /><stop offset="1" stopColor="#04170f" /></linearGradient>
        <linearGradient id={g('or')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a4761b" /><stop offset="0.35" stopColor="#f7e08a" /><stop offset="0.6" stopColor="#d9a62b" /><stop offset="1" stopColor="#8c6314" /></linearGradient>
        <linearGradient id={g('liege')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b98a58" /><stop offset="0.5" stopColor="#ecd0a2" /><stop offset="1" stopColor="#a5763f" /></linearGradient>
        <linearGradient id={g('etiq')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#efe0c3" /></linearGradient>
      </defs>
      <ellipse cx="35" cy="165" rx="22" ry="4" fill="#000" fillOpacity="0.28" />
      {/* geyser de mousse */}
      <g className="anniv-jet">
        {[[28, 0], [35, 0.15], [42, 0.3], [32, 0.45], [38, 0.6]].map(([x, d], i) => (
          <circle key={i} className="anniv-goutte" style={{ animationDelay: `${d}s`, '--dx': `${(x - 35) * 1.4}px` }} cx={x} cy="14" r={1.4 + (i % 3) * 0.5} fill="#fff" />
        ))}
      </g>
      {/* bouchon + muselet */}
      <g className="anniv-bouchon">
        <path d="M28 8 q7 -8 14 0 v14 h-14z" fill={`url(#${g('liege')})`} />
        <path d="M28 14 h14 M28 18 h14" stroke="#7a5428" strokeWidth="0.7" opacity="0.5" />
      </g>
      <path d="M27 22 h16 l2 9 h-20z" fill={`url(#${g('or')})`} />
      <path d="M29 22 l-1 9 M35 22 v9 M41 22 l1 9 M26 26 h18" stroke="#6b4a0e" strokeWidth="0.8" opacity="0.7" />
      {/* goulot et corps */}
      <path d="M26 31 h18 v22 c0 12 22 20 22 46 v58 a6 6 0 0 1 -6 6 h-48 a6 6 0 0 1 -6 -6 v-58 c0 -26 20 -34 20 -46z" fill={`url(#${g('verre')})`} />
      <path d="M26 31 h18 v8 h-18z" fill={`url(#${g('or')})`} />
      <path d="M26 39 h18 l1 -8 h-20z" fill={`url(#${g('or')})`} opacity="0.9" />
      {/* reflets */}
      <path d="M20 66 c0 -10 6 -14 7 -24 v100" fill="none" stroke="#fff" strokeOpacity="0.32" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 78 c4 6 6 12 6 22 v40" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
      {/* étiquette */}
      <rect x="11" y="106" width="48" height="38" rx="3" fill={`url(#${g('etiq')})`} stroke="#d9a62b" strokeWidth="1.2" />
      <rect x="14" y="109" width="42" height="32" rx="2" fill="none" stroke="#d9a62b" strokeWidth="0.6" />
      <path d="M35 112.5 l2.3 4.7 5.2 .8 -3.8 3.6 .9 5.2 -4.6 -2.5 -4.6 2.5 .9 -5.2 -3.8 -3.6 5.2 -.8z" fill="#de3327" />
      <text x="35" y="136" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="Georgia, serif" fill="#3a2a10" letterSpacing="1.4">SAM</text>
      <rect x="22" y="138.4" width="26" height="0.9" fill="#d9a62b" />
    </svg>
  )
}

function Flute({ id }) {
  const g = (n) => `${id}-${n}`
  return (
    <svg viewBox="0 0 50 150" className="anniv-svg anniv-svg--flute" aria-hidden="true">
      <defs>
        <linearGradient id={g('champ')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdeea4" /><stop offset="0.5" stopColor="#f2c94c" /><stop offset="1" stopColor="#d99a1a" /></linearGradient>
        <linearGradient id={g('verre')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="0.35" stopColor="#dff1f8" stopOpacity="0.12" /><stop offset="1" stopColor="#bcd9e6" stopOpacity="0.38" /></linearGradient>
      </defs>
      <ellipse cx="25" cy="146" rx="17" ry="3.4" fill="#000" fillOpacity="0.28" />
      <ellipse cx="25" cy="141" rx="15" ry="4" fill={`url(#${g('verre')})`} stroke="#9fc4d3" strokeWidth="0.9" />
      <rect x="23.2" y="86" width="3.6" height="54" fill={`url(#${g('verre')})`} stroke="#9fc4d3" strokeWidth="0.7" />
      <path d="M9 6 h32 l-2.4 58 c-.6 15 -6 24 -13.6 24 s-13 -9 -13.6 -24z" fill={`url(#${g('verre')})`} stroke="#9fc4d3" strokeWidth="1" />
      <path d="M11 22 h28 l-1.8 42 c-.5 12 -5 19.4 -12.2 19.4 s-11.7 -7.4 -12.2 -19.4z" fill={`url(#${g('champ')})`} />
      {/* mousse */}
      <ellipse cx="25" cy="22" rx="14" ry="3" fill="#fff9d9" />
      {[[15, 22], [21, 19.5], [27, 19], [33, 21.5], [37, 22.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#fffdf0" />)}
      {/* bulles */}
      {[[19, 0], [25, 0.7], [31, 1.4], [22, 2.1], [28, 2.8], [34, 0.35]].map(([x, d], i) => (
        <circle key={i} className="anniv-bulle" style={{ animationDelay: `${d}s` }} cx={x} cy="78" r={0.9 + (i % 3) * 0.3} fill="#fff" />
      ))}
      {/* reflets du verre */}
      <path d="M13 12 c-.3 14 .2 30 2 50" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 14 c.4 10 .2 22 -1 36" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Petites étoiles qui scintillent dans le ciel
const ETOILES = [[8, 14, 0], [22, 6, 0.8], [38, 18, 1.5], [57, 8, 0.4], [74, 16, 1.1], [90, 7, 1.9], [14, 36, 2.4], [84, 34, 0.2]]

// Scène complète : ciel étoilé + feu d'artifice + gâteau, bouteille et flûte
export function ScenneAnniversaire({ grand = false }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <div className={`anniv-scene${grand ? ' anniv-scene--grande' : ''}`} aria-hidden="true">
      {ETOILES.map(([x, y, d], i) => <i key={i} className="anniv-etoile" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
      <FeuArtifice />
      <div className="anniv-table">
        <Bouteille id={`${id}b`} />
        <Gateau id={`${id}g`} />
        <Flute id={`${id}f`} />
      </div>
    </div>
  )
}
