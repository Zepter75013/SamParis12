import { useEffect, useRef } from 'react'

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
          <p className="eyebrow">Course à pied hors stade · Porte de Charenton · Est. 1887</p>
          <h1>On court le 12<sup>e</sup> depuis <em>1887</em></h1>
          <p className="lead">
            Du 10 km au marathon, sur route, en forêt et sur la piste. Marche nordique, running
            forme, trail et cross : un club, tous les niveaux, des cadets aux masters.
          </p>
          <div className="hero-actions">
            <a className="btn btn--solid" href="#adhesion">Rejoindre le club →</a>
            <a className="btn btn--ghost" href="#terrain">Voir les créneaux</a>
          </div>
          <div className="next-run">
            <b>Prochaine sortie commune</b>
            <span className="big">
              Dimanche · 9h00 <span className="dot">·</span> Bois de Vincennes, carrefour de Beauté
            </span>
            <br />
            Sortie longue — 16 à 22 km <span className="dot">·</span> allure 5:30 à 6:15 /km{' '}
            <span className="dot">·</span> ouverte aux non-adhérents
          </div>
        </div>
      </section>

      <dl className="stats shell" style={{ maxWidth: 'none', paddingInline: 0 }}>
        <div>
          <dt>Année de fondation</dt>
          <dd>1887</dd>
        </div>
        <div>
          <dt>Distances préparées</dt>
          <dd>10 → 42,2 km</dd>
        </div>
        <div>
          <dt>Catégories accueillies</dt>
          <dd>Cadets → Masters</dd>
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
            <h2>Un club de quartier, une histoire de fond</h2>
            <p className="lead-note">
              Le SAM Paris 12 est un club d'athlétisme affilié à la FFA, installé à la Porte de
              Charenton depuis plus d'un siècle. On y vient pour progresser en course à pied hors
              stade : 10 km, semi, marathon, trail et cross.
            </p>
            <p>
              Ni élite ni compétition à tout prix. L'entraînement est encadré, la programmation
              est sérieuse — fractionné, seuil, sorties longues du dimanche — mais l'ambiance
              reste celle d'un groupe qui court ensemble et se retrouve après l'effort.
            </p>
          </div>
        </section>

        <section className="leg" id="disciplines">
          <div className="leg__marker"><i>KM</i><b>02</b></div>
          <div className="leg__body">
            <p className="eyebrow">Les disciplines</p>
            <h2>Quatre façons de s'entraîner</h2>
            <p className="lead-note">
              Chaque pratique a son groupe, son créneau et son encadrant. On passe de l'une à
              l'autre selon la saison et les objectifs.
            </p>
            <div className="disc">
              <article>
                <h3>Course hors stade <span>10 KM → 42,2 KM</span></h3>
                <p>Le cœur du club. Plans de préparation route, séances de VMA au Bois de Vincennes, sortie longue le dimanche matin.</p>
              </article>
              <article>
                <h3>Marche nordique <span>DÉBUTANT → CONFIRMÉ</span></h3>
                <p>Bâtons fournis pour l'essai. Sortie technique en forêt, travail du geste complet et du gainage, sans impact.</p>
              </article>
              <article>
                <h3>Running forme <span>REPRISE · SANTÉ</span></h3>
                <p>Pour (re)commencer à courir sans chrono. Alternance marche-course, allure conversationnelle, progression douce.</p>
              </article>
              <article>
                <h3>Trail &amp; cross <span>HIVER · TERRAIN</span></h3>
                <p>Saison de cross de novembre à février, sorties trail sur les reliefs franciliens et préparation aux courses nature.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="leg" id="terrain">
          <div className="leg__marker"><i>KM</i><b>03</b></div>
          <div className="leg__body">
            <p className="eyebrow">Notre terrain de jeu</p>
            <h2>Le Bois, la piste, les berges</h2>
            <p className="lead-note">
              Tout part de la Porte de Charenton. En quelques minutes de footing, on est au vert.
            </p>
            <ul className="spots">
              <li><b>Bois de Vincennes</b><span>Boucles de 2 à 15 km, lac Daumesnil, plaine de la Faluère, hippodrome. Le terrain des sorties longues et du fractionné nature.</span></li>
              <li><b>Stade Léo-Lagrange</b><span>Piste de 400 m à la Porte de Charenton pour les séances de vitesse et les tests VMA.</span></li>
              <li><b>Berges de Seine</b><span>Parcours plat et roulant vers Bercy et le pont de Charenton pour le travail d'allure spécifique.</span></li>
            </ul>
            <figure className="profile">
              <figcaption>Sortie longue type — boucle du lac Daumesnil · 10 km · D+ 38 m</figcaption>
              <svg viewBox="0 0 620 170" role="img" aria-label="Profil altimétrique de la boucle du lac Daumesnil : dénivelé faible, entre 33 et 52 mètres d'altitude sur 10 kilomètres.">
                <g fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="var(--stone)">
                  <text x="8" y="30">52 m</text>
                  <text x="8" y="140">33 m</text>
                  <text x="44" y="163">0</text>
                  <text x="156" y="163">2,5</text>
                  <text x="292" y="163">5 km</text>
                  <text x="430" y="163">7,5</text>
                  <text x="560" y="163">10</text>
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
            <h2>Notre course, ouverte à tout le quartier</h2>
            <p className="lead-note">
              Chaque année, le club organise sa propre course sur route dans le 12<sup>e</sup>{' '}
              arrondissement : un 10 km chronométré, une boucle famille et une course des enfants,
              au départ du Bois de Vincennes.
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
            <h2>Deux séances d'essai, puis on s'inscrit</h2>
            <p className="lead-note">
              On vient courir deux fois gratuitement pour voir si le groupe et les allures
              conviennent. L'inscription se fait ensuite en ligne, paiement carte bancaire
              sécurisé.
            </p>
            <div className="join">
              <div className="join-head">
                <b>Cotisation saison 2026 – 2027</b>
                <span className="price">à partir de <strong>190 €</strong> / an</span>
              </div>
              <ul>
                <li>Licence FFA compétition ou running incluse</li>
                <li>Tous les créneaux encadrés : piste, forêt, sortie longue</li>
                <li>Plans d'entraînement personnalisés selon l'objectif</li>
                <li>Dossards négociés sur les courses partenaires</li>
                <li>Tenue du club et tarif préférentiel chez Team Outdoor</li>
              </ul>
              <div className="join-foot">
                <a className="btn btn--solid" href="https://samparis12.org/public/paiement/index.php">
                  Payer ma cotisation en ligne →
                </a>
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
              Le plus simple : venir un soir de séance au stade Léo-Lagrange ou écrire au club, on
              vous met en relation avec le bon groupe.
            </p>
            <dl className="contact-grid">
              <div>
                <dt>Adresse</dt>
                <dd>Stade Léo-Lagrange<br />68 boulevard Poniatowski<br />75012 Paris — Porte de Charenton</dd>
              </div>
              <div>
                <dt>Écrire au club</dt>
                <dd><a href="mailto:contact@samparis12.org">contact@samparis12.org</a></dd>
              </div>
              <div>
                <dt>Suivre le club</dt>
                <dd><a href="https://www.facebook.com/SamParis12/">Facebook</a> · <a href="https://www.strava.com/clubs/127847">Club Strava</a></dd>
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
