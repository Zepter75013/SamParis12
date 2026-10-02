import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Borne, useActiveLegs } from '../components/Legs.jsx'
import { BORNES } from '../data/rubriques.js'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'

export default function Home() {
  const lineRef = useRef(null)
  const dotRef = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const line = lineRef.current
    const dot = dotRef.current
    if (!line || !dot) return

    const len = line.getTotalLength()
    const end = line.getPointAtLength(len)
    dot.setAttribute('cx', end.x)
    dot.setAttribute('cy', end.y)

    if (reduce) return

    line.style.strokeDasharray = String(len)
    line.style.strokeDashoffset = String(len)
    dot.style.opacity = '0'

    const raf = requestAnimationFrame(() => {
      line.style.transition = 'stroke-dashoffset 1.6s ease-out'
      line.style.strokeDashoffset = '0'
    })

    function onEnd() {
      dot.style.transition = 'opacity 0.3s'
      dot.style.opacity = '1'
    }
    line.addEventListener('transitionend', onEnd)

    return () => {
      cancelAnimationFrame(raf)
      line.removeEventListener('transitionend', onEnd)
    }
  }, [])

  useActiveLegs()
  // Effectifs réels du club (base de données) ; tant qu'ils ne sont pas chargés, rien d'inventé.
  const { data: stats } = useFetch(() => api.getPublicStats(), [])
  const ages = stats && stats.ageMin != null && stats.ageMax != null ? `${stats.ageMin} → ${stats.ageMax} ans` : null

  return (
    <main id="top">
      <section className="hero">
        <svg className="hero-trace" viewBox="0 0 1180 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="var(--line)" strokeWidth="2">
            <path d="M-40 470 C 160 380 220 520 400 430 S 640 300 820 380 1000 470 1240 360" />
            <path d="M-40 250 C 200 300 300 150 520 210 S 820 340 1040 240 1260 150 1320 190" />
            <path d="M120 -40 C 180 160 60 260 200 380 S 420 520 380 620" />
          </g>
          <path
            ref={lineRef}
            d="M-30 520 C 180 470 240 300 430 320 C 620 340 640 150 840 170 C 1010 188 1080 90 1240 120"
            fill="none"
            stroke="var(--vermilion)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle ref={dotRef} r="6" fill="var(--vermilion)" />
        </svg>
        <div className="shell">
          <p className="eyebrow">Club d'athlétisme affilié FFA · Porte de Charenton · Fondé en 1887</p>
          <h1>On court le 12<sup>e</sup> depuis <em>1887</em></h1>
          <p className="lead">
            Premier club d'athlétisme hors stade de Paris
            {stats ? `, avec ${stats.adherents} adhérents` : ''}
            {stats && ages ? ` de ${stats.ageMin} à ${stats.ageMax} ans` : ''}.
            {' '}Running du 5 km à l'ultra-trail, marche nordique sportive : un encadrement diplômé
            FFA, pour tous les niveaux.
          </p>
          <div className="hero-actions">
            <Link className="btn btn--solid" to="/adhesion">Rejoindre le club →</Link>
            <Link className="btn btn--ghost" to="/horaires">Voir les créneaux</Link>
          </div>
          <div className="next-run">
            <b>Entraînements de la semaine</b>
            <span className="big">
              Mardi &amp; jeudi · 18h30 et 19h30 <span className="dot">·</span> Stade Léo Lagrange
            </span>
            <br />
            Samedi &amp; dimanche · 9h30 <span className="dot">·</span> Bois de Vincennes{' '}
            <span className="dot">·</span> sorties longues et trails, programme du trimestre selon le groupe
          </div>
        </div>
      </section>

      <dl className="stats shell" style={{ maxWidth: 'none', paddingInline: 0 }}>
        <div>
          <dt>Année de fondation</dt>
          <dd>1887</dd>
        </div>
        <div>
          <dt>Adhérents</dt>
          <dd>{stats ? stats.adherents : '—'}</dd>
        </div>
        <div>
          <dt>Âges accueillis</dt>
          <dd>{ages || 'Dès 16 ans'}</dd>
        </div>
        <div>
          <dt>Créneaux hebdo</dt>
          <dd>Mar · Jeu · Sam · Dim</dd>
        </div>
      </dl>

      <div className="shell legs">
        <div className="course-line" aria-hidden="true" />

        {BORNES.map((b, i) => (
          <section className="leg" id={b.id} key={b.id}>
            <div className="leg__marker"><Borne n={i + 1} /></div>
            <div className="leg__body">
              <p className="eyebrow">{b.theme}</p>
              <h2>{b.titre}</h2>
              <p className="lead-note">{b.texte}</p>
              <p className="more-links">
                <Link to={b.to}>{b.lien} →</Link>
              </p>
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
