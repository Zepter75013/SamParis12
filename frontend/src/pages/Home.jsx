import { Link } from 'react-router-dom'
import { Borne, useActiveLegs } from '../components/Legs.jsx'
import { HeroSlides } from '../components/HeroSlides.jsx'
import { BORNES } from '../data/rubriques.js'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'

export default function Home() {
  useActiveLegs()
  // Effectifs réels du club (base de données) ; tant qu'ils ne sont pas chargés, rien d'inventé.
  const { data: stats } = useFetch(() => api.getPublicStats(), [])
  const ages = stats && stats.ageMin != null && stats.ageMax != null ? `${stats.ageMin} → ${stats.ageMax} ans` : null

  return (
    <main id="top">
      <section className="hero">
        <div className="shell hero__grid">
          <div className="hero__text">
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
          <HeroSlides />
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
