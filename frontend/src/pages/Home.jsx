import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Borne, useActiveLegs } from '../components/Legs.jsx'

// Une borne par rubrique du menu : un court texte et un lien vers la page détaillée.
const BORNES = [
  { id: 'club', theme: 'Qui sommes-nous', titre: 'Un club centenaire, la première référence hors stade à Paris',
    texte: "Fondé en 1887 et affilié à la FFA, le SAM Paris 12 est le premier club d'athlétisme hors stade de Paris, distingué en 2026 (Label Or Running, Label Bronze Stade). Conseil d'administration, entraîneurs, effectifs.",
    to: '/le-club', lien: 'Découvrir le club' },
  { id: 'histoire', theme: 'Histoire du club', titre: 'De Montrouge en 1887 aux Foulées du 12ème',
    texte: "Né autour d'un groupe de joueurs de tambourin, devenu Société Athlétique de Montrouge en 1890 puis SAM Paris 12 : plus d'un siècle d'histoire en quatre chapitres.",
    to: '/histoire', lien: "Lire l'histoire du club" },
  { id: 'marche-nordique', theme: 'Marche nordique', titre: 'Une discipline à part entière de la FFA',
    texte: "Section loisir en 2012, section sportive depuis 2015 : des séances le mardi, jeudi, samedi et dimanche, encadrées par des entraîneurs diplômés.",
    to: '/marche-nordique', lien: 'Découvrir la marche nordique' },
  { id: 'horaires', theme: 'Horaires et lieux', titre: 'Trois à quatre sorties par semaine',
    texte: "Mardi et jeudi soir (échauffement à 18h30 ou 19h30), samedi et dimanche à 9h30. Tous les rendez-vous sont au stade Léo Lagrange, à la Porte de Charenton.",
    to: '/horaires', lien: 'Voir les horaires et lieux' },
  { id: 'terrain', theme: 'Notre terrain de jeu', titre: 'Le Bois de Vincennes, en toute saison',
    texte: "« Le Paradis de la course à pied se trouve à 100 % sur le sol parisien. » Circuit Michel Jazy, Butte aux Canons, circuit cross : nos parcours favoris.",
    to: '/terrain', lien: 'Découvrir nos parcours' },
  { id: 'adhesion', theme: 'Adhésion au club', titre: "Une séance d'essai, puis on s'inscrit",
    texte: "Saison 2026-2027 : 120 € par an, licence FFA et assurance comprises, sans certificat médical (un questionnaire de santé suffit).",
    to: '/adhesion', lien: "Voir comment s'inscrire" },
  { id: 'courses', theme: 'Nos courses', titre: 'Où retrouver les copains',
    texte: "Les prochaines compétitions auxquelles nos coureurs sont inscrits, du 10 km au marathon, et les Foulées du 12ème.",
    to: '/nos-courses', lien: 'Voir les prochaines courses' },
  { id: 'resultats', theme: 'Nos résultats', titre: 'Les derniers résultats',
    texte: "Les participations les plus importantes de nos coureurs et leurs meilleurs classements.",
    to: '/nos-resultats', lien: 'Voir les résultats' },
  { id: 'performances', theme: 'Nos performances', titre: 'Les records du club',
    texte: "Nos meilleures performances depuis 2000, chez les femmes et chez les hommes, du 5 km au 100 km et sur piste.",
    to: '/nos-performances', lien: 'Voir les records' },
  { id: 'nous-y-etions', theme: 'Nous y étions', titre: 'Retour en images',
    texte: "Galeries photos et récits des grands rendez-vous du club depuis 2012.",
    to: '/nous-y-etions', lien: 'Voir les photos' },
  { id: 'contact', theme: 'Contact', titre: 'Nous rejoindre sur le terrain',
    texte: "Venir un soir de séance au stade Léo Lagrange ou écrire au club : on vous met en relation avec le bon groupe.",
    to: '/contact', lien: 'Nous contacter' },
]

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
            Premier club d'athlétisme hors stade de Paris, avec 686 adhérents de 16 à 84 ans.
            Running du 5 km à l'ultra-trail, marche nordique sportive : un encadrement diplômé
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
          <dt>Adhérents (2 oct. 2026)</dt>
          <dd>686</dd>
        </div>
        <div>
          <dt>Âges accueillis</dt>
          <dd>16 → 84 ans</dd>
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
