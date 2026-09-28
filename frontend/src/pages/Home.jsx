import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

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

  useEffect(() => {
    const legs = document.querySelectorAll('.leg')
    if (!('IntersectionObserver' in window) || legs.length === 0) return

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            legs.forEach((l) => l.classList.remove('is-active'))
            entry.target.classList.add('is-active')
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    legs.forEach((l) => obs.observe(l))
    return () => obs.disconnect()
  }, [])

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
            Premier club d'athlétisme hors stade de Paris, avec plus de 680 adhérents majeurs.
            Running du 5 km à l'ultra-trail, marche nordique sportive : un encadrement diplômé
            FFA, pour tous les niveaux.
          </p>
          <div className="hero-actions">
            <a className="btn btn--solid" href="#adhesion">Rejoindre le club →</a>
            <a className="btn btn--ghost" href="#terrain">Voir les créneaux</a>
          </div>
          <div className="next-run">
            <b>Entraînements de la semaine</b>
            <span className="big">
              Mardi &amp; jeudi · 18h30 et 19h30 <span className="dot">·</span> Stade Léo Lagrange
            </span>
            <br />
            Dimanche · 9h30 <span className="dot">·</span> Bois de Vincennes{' '}
            <span className="dot">·</span> programme du trimestre selon le groupe
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
          <dd>680+</dd>
        </div>
        <div>
          <dt>Catégories accueillies</dt>
          <dd>Séniors → Vétérans</dd>
        </div>
        <div>
          <dt>Créneaux hebdo</dt>
          <dd>Mar · Jeu · Dim</dd>
        </div>
      </dl>

      <div className="shell legs">
        <div className="course-line" aria-hidden="true" />

        <section className="leg" id="club">
          <div className="leg__marker"><i>KM</i><b>01</b></div>
          <div className="leg__body">
            <p className="eyebrow">Qui sommes-nous</p>
            <h2>Un club centenaire, la première référence hors stade à Paris</h2>
            <p className="lead-note">
              Fondé en 1887 et affilié à la Fédération Française d'Athlétisme, le SAM Paris 12
              rassemble plus de 680 adhérents majeurs (44&nbsp;% de femmes). C'est aujourd'hui le
              premier club d'athlétisme hors stade de Paris.
            </p>
            <p>
              En 2026, la FFA lui a décerné le Label Or pour le secteur Running et le Label Bronze
              pour le secteur Stade, récompensant la qualité de son encadrement : 28 entraîneurs
              de course à pied hors stade et 5 entraîneurs de marche nordique, tous diplômés et
              bénévoles.
            </p>
          </div>
        </section>

        <section className="leg" id="disciplines">
          <div className="leg__marker"><i>KM</i><b>02</b></div>
          <div className="leg__body">
            <p className="eyebrow">Les disciplines</p>
            <h2>Quatre programmes, un même club</h2>
            <p className="lead-note">
              Chaque adhérent choisit son programme selon ses objectifs, avec un plan
              d'entraînement mis à jour chaque trimestre par les entraîneurs.
            </p>
            <div className="disc">
              <article>
                <h3>Programme Général <span>5 KM → ULTRA</span></h3>
                <p>VMA, seuil et endurance pour progresser en course à pied hors stade, du 5 km à l'ultra-trail, sur route comme sur piste.</p>
              </article>
              <article>
                <h3>Programme Trail <span>XXS → XL</span></h3>
                <p>Groupes classés par km-effort (distance + dénivelé). Sorties nature en forêt et en Île-de-France.</p>
              </article>
              <article>
                <h3>Programme Marathon <span>SUB 2H45 → 3H45+</span></h3>
                <p>Un plan par objectif de temps, allures spécifiques et sorties longues progressives jusqu'au marathon de Paris.</p>
              </article>
              <article>
                <h3>Marche nordique sportive <span>DEPUIS 2015</span></h3>
                <p>Mardi, jeudi et dimanche. Technique, allure et convivialité, encadrées par des entraîneurs diplômés MNS.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="leg" id="terrain">
          <div className="leg__marker"><i>KM</i><b>03</b></div>
          <div className="leg__body">
            <p className="eyebrow">Notre terrain de jeu</p>
            <h2>Le Bois de Vincennes, en toute saison</h2>
            <p className="lead-note">
              « Le Paradis de la course à pied se trouve à 100&nbsp;% sur le sol parisien : c'est
              le Bois de Vincennes. » Tout part du stade Léo Lagrange, à la Porte de Charenton.
            </p>
            <ul className="spots">
              <li><b>Stade Léo Lagrange</b><span>Le point de rendez-vous de toutes nos séances, et le lieu du fractionné sur piste (400 m).</span></li>
              <li><b>Circuit Michel Jazy</b><span>2,3 km sur terrain souple et entièrement boisé, tracé par le champion du même nom.</span></li>
              <li><b>Circuit Cross &amp; Butte aux Canons</b><span>2,7 km à 80 m de dénivelé par tour pour les trailers, et un ancien terrain militaire idéal pour le renforcement.</span></li>
            </ul>
            <figure className="profile">
              <figcaption>Circuit Michel Jazy — Bois de Vincennes · 2,3 km</figcaption>
              <svg viewBox="0 0 620 170" role="img" aria-label="Illustration du profil du circuit Michel Jazy, terrain boisé au relief modéré.">
                <g fontFamily="Barlow Condensed, sans-serif" fontSize="11" fill="var(--stone)">
                  <text x="44" y="163">Départ</text>
                  <text x="540" y="163">Arrivée</text>
                </g>
                <g stroke="var(--line)" strokeWidth="1">
                  <line x1="48" y1="26" x2="600" y2="26" />
                  <line x1="48" y1="83" x2="600" y2="83" />
                  <line x1="48" y1="140" x2="600" y2="140" />
                </g>
                <path
                  d="M48 128 L120 110 L188 132 L262 74 L330 92 L398 48 L470 120 L540 108 L600 134 L600 140 L48 140 Z"
                  fill="color-mix(in srgb, var(--vermilion) 14%, transparent)"
                  stroke="none"
                />
                <path
                  d="M48 128 L120 110 L188 132 L262 74 L330 92 L398 48 L470 120 L540 108 L600 134"
                  fill="none"
                  stroke="var(--vermilion)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="398" cy="48" r="3.5" fill="var(--vermilion)" />
              </svg>
            </figure>
          </div>
        </section>

        <section className="leg" id="foulees">
          <div className="leg__marker"><i>KM</i><b>04</b></div>
          <div className="leg__body">
            <p className="eyebrow">Les Foulées du 12ème</p>
            <h2>Notre course, organisée par des coureurs pour des coureurs</h2>
            <p className="lead-note">
              Depuis 2005, le club reprend l'organisation des anciennes Foulées d'Aligre, devenues
              Les Foulées du 12<sup>e</sup>. Une course sur route dans l'arrondissement, pensée par
              des coureurs pour des coureurs.
            </p>
            <p>
              Bénévoles, signaleurs, ravitaillement, chronométrie : l'organisation est portée par
              les adhérents. Les inscriptions et les résultats des éditions passées sont regroupés
              sur le site dédié{' '}
              <a href="http://foulees.samparis12.org/" style={{ color: 'var(--vermilion)' }}>foulees.samparis12.org</a>.
            </p>
          </div>
        </section>

        <section className="leg" id="adhesion">
          <div className="leg__marker"><i>KM</i><b>05</b></div>
          <div className="leg__body">
            <p className="eyebrow">Adhésion au club</p>
            <h2>Une séance d'essai, puis on s'inscrit</h2>
            <p className="lead-note">
              Les adhésions sont ouvertes à partir du 1<sup>er</sup> septembre pour la saison en
              cours. Après une séance d'essai, l'inscription se fait en ligne, réglable par carte
              bancaire, virement ou chèque.
            </p>
            <div className="join">
              <div className="join-head">
                <b>Cotisation saison 2026 – 2027</b>
                <span className="price"><strong>120 €</strong> / an</span>
              </div>
              <ul>
                <li>Running, Marche Nordique Sportive ou Marche Loisir — même tarif</li>
                <li>Licence FFA, assurance et adhésion à l'association incluses</li>
                <li>Plus de certificat médical : un questionnaire de santé FFA suffit</li>
                <li>Entraînements encadrés par des entraîneurs diplômés et bénévoles</li>
                <li>Tarif préférentiel chez notre partenaire Team Outdoor</li>
              </ul>
              <div className="join-foot">
                <Link className="btn btn--solid" to="/adhesion/paiement">
                  Payer ma cotisation en ligne →
                </Link>
                <a className="btn btn--ghost" href="#contact">Poser une question</a>
              </div>
            </div>
          </div>
        </section>

        <section className="leg" id="contact">
          <div className="leg__marker"><i>KM</i><b>06</b></div>
          <div className="leg__body">
            <p className="eyebrow">Contact</p>
            <h2>Nous rejoindre sur le terrain</h2>
            <p className="lead-note">
              Le plus simple : venir un soir de séance au stade Léo Lagrange ou écrire au club, on
              vous met en relation avec le bon groupe.
            </p>
            <dl className="contact-grid">
              <div>
                <dt>Entraînements</dt>
                <dd>Stade Léo Lagrange<br />Boulevard Poniatowski<br />75012 Paris — Porte de Charenton</dd>
              </div>
              <div>
                <dt>Écrire au club</dt>
                <dd><a href="mailto:contact@samparis12.org">contact@samparis12.org</a><br />07 82 18 08 90</dd>
              </div>
              <div>
                <dt>Suivre le club</dt>
                <dd><a href="https://www.facebook.com/SamParis12/">Facebook</a></dd>
              </div>
              <div>
                <dt>Accès</dt>
                <dd>Métro 8 — Porte de Charenton<br />Tram T3a — Porte de Charenton</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  )
}
