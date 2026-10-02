import { Link } from 'react-router-dom'
import ContentBlocks from '../components/ContentBlocks.jsx'
import { SITE } from '../data/siteContent.js'

function Page({ eyebrow, title, children }) {
  return (
    <main className="shell page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </main>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function ArticlePage({ eyebrow, title, blocks }) {
  return (
    <Page eyebrow={eyebrow} title={title}>
      <ContentBlocks blocks={blocks} />
    </Page>
  )
}

export const HistoirePage = () => <ArticlePage eyebrow="Le club" title="Histoire du club" blocks={SITE.histoire} />
export const HorairesPage = () => <ArticlePage eyebrow="Le club" title="Horaires et lieux" blocks={SITE.horaires} />
export const TerrainPage = () => <ArticlePage eyebrow="Le club" title="Notre terrain de jeu" blocks={SITE.terrain.slice(1)} />
export const MarcheNordiquePage = () => <ArticlePage eyebrow="Disciplines" title="Marche nordique" blocks={SITE.marcheNordique} />

function Pyramide() {
  const max = Math.max(...SITE.pyramide.flatMap((b) => [Number(b.femmes) || 0, Number(b.hommes) || 0]))
  const totalF = SITE.pyramide.reduce((s, b) => s + (Number(b.femmes) || 0), 0)
  const totalH = SITE.pyramide.reduce((s, b) => s + (Number(b.hommes) || 0), 0)
  const total = totalF + totalH
  return (
    <div className="pyr" role="img" aria-label={`Pyramide des âges : ${totalF} femmes et ${totalH} hommes`}>
      <div className="pyr-legend">
        <span><i style={{ background: 'var(--vermilion)' }} /> Femmes · {totalF} ({Math.round((totalF / total) * 100)} %)</span>
        <span><i style={{ background: 'var(--ink-soft)' }} /> Hommes · {totalH} ({Math.round((totalH / total) * 100)} %)</span>
      </div>
      {SITE.pyramide.map((b) => (
        <div className="pyr-row" key={b.tranche}>
          <div className="pyr-side pyr-side--f">
            <span>{Number(b.femmes) || ''}</span>
            <div className="pyr-bar"><div style={{ width: `${((Number(b.femmes) || 0) / max) * 100}%`, background: 'var(--vermilion)' }} /></div>
          </div>
          <b>{b.tranche}</b>
          <div className="pyr-side">
            <div className="pyr-bar"><div style={{ width: `${((Number(b.hommes) || 0) / max) * 100}%`, background: 'var(--ink-soft)' }} /></div>
            <span>{Number(b.hommes) || ''}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function People({ list }) {
  return (
    <ul className="people">
      {list.map((p) => (
        <li key={p.nom}><b>{p.nom}</b><span>{p.role}</span></li>
      ))}
    </ul>
  )
}

export function LeClubPage() {
  return (
    <Page eyebrow="Qui sommes-nous" title="Le club">
      <ContentBlocks blocks={SITE.leClub} />

      <div className="prose">
        <h2>Nos programmes</h2>
        <p>Chaque adhérent choisit son programme selon ses objectifs, avec un plan d'entraînement mis à jour chaque trimestre par les entraîneurs.</p>
      </div>
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
          <p>Mardi, jeudi, samedi et dimanche, encadrée par des entraîneurs diplômés. <Link to="/marche-nordique">En savoir plus →</Link></p>
        </article>
      </div>

      <div className="prose">
        <h2>Conseil d'administration</h2>
      </div>
      <People list={SITE.conseil} />

      <div className="prose">
        <h2>Nos entraîneurs</h2>
        <p>Ils ont leur diplôme d'entraîneur de la FFA, ils sont entièrement bénévoles, et ils sont présents à toutes les séances d'entraînement…</p>
      </div>
      <People list={SITE.entraineurs} />

      <div className="prose">
        <h2>Effectifs du club au {SITE.effectifsDate}</h2>
      </div>
      <table className="data-table data-table--narrow">
        <thead><tr><th>Activité</th><th className="num">Adhérents</th></tr></thead>
        <tbody>
          {SITE.effectifs.map((e) => (
            <tr key={e.activite} className={e.activite === 'Total' ? 'total' : ''}>
              <td>{e.activite}</td><td className="num">{e.nombre}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="prose">
        <h2>Pyramide des âges au {SITE.effectifsDate}</h2>
      </div>
      <Pyramide />
    </Page>
  )
}

const SNAPSHOT_NOTE = `Données reprises du site actuel du club (état au ${SITE.instantane}).`

export function NosCoursesPage() {
  const today = new Date().toISOString().slice(0, 10)
  const rows = SITE.prochainesCourses.filter((c) => c.iso >= today)
  return (
    <Page eyebrow="Compétition" title="Nos prochaines courses">
      <div className="prose">
        <p>
          Nos coureurs sont inscrits à de nombreuses compétitions sur les mois à venir. Voici celles ayant
          plus de 5 inscrits SAM Paris 12.
        </p>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Course</th><th className="num">Inscrits SAM</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.iso + c.titre}>
                <td>{formatDate(c.iso)}</td>
                <td>{c.type}</td>
                <td>{c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.titre}</a> : c.titre}</td>
                <td className="num">{c.inscrits}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4}>Aucune course à venir dans cet instantané.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="note">{SNAPSHOT_NOTE}</p>
      <div className="prose">
        <h2>Les Foulées du 12<sup>e</sup></h2>
        <p>
          Depuis 2005, le club organise les Foulées du 12<sup>e</sup>, anciennes Foulées d'Aligre : une course
          organisée par des coureurs pour des coureurs. Inscriptions et résultats des éditions passées sur{' '}
          <a href="http://foulees.samparis12.org/" target="_blank" rel="noreferrer">foulees.samparis12.org</a>.
        </p>
      </div>
    </Page>
  )
}

export function NosResultatsPage() {
  const rows = [...SITE.derniersResultats].sort((a, b) => (a.iso < b.iso ? 1 : -1))
  return (
    <Page eyebrow="Compétition" title="Nos derniers résultats">
      <div className="prose">
        <p>Voici les participations les plus importantes et les résultats les plus significatifs de nos coureurs.</p>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Course</th><th className="num">Classés SAM</th><th className="num">Meilleur samien</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.iso + r.titre}>
                <td>{formatDate(r.iso)}</td>
                <td>{r.type}</td>
                <td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.titre}</a> : r.titre}</td>
                <td className="num">{r.classesSam}</td>
                <td className="num">{r.meilleurRang ? `${r.meilleurRang} / ${r.meilleurTotal}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">{SNAPSHOT_NOTE}</p>
    </Page>
  )
}

function RecordCell({ rec }) {
  if (!rec) return <td className="rec rec--empty">—</td>
  return (
    <td className="rec">
      <b>{rec.temps}</b>
      <span>{rec.course}</span>
      <span>{rec.date}</span>
    </td>
  )
}

export function NosPerformancesPage() {
  return (
    <Page eyebrow="Compétition" title="Nos meilleures performances">
      <div className="prose">
        <p>Records du club depuis 2000.</p>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Épreuve</th><th>Féminin</th><th>Masculin</th></tr></thead>
          <tbody>
            {SITE.records.map((r) => (
              <tr key={r.epreuve}>
                <th scope="row">{r.epreuve}</th>
                <RecordCell rec={r.femme} />
                <RecordCell rec={r.homme} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">{SNAPSHOT_NOTE}</p>
    </Page>
  )
}

export function AdhesionPage() {
  return (
    <Page eyebrow="Adhésion au club" title="Une séance d'essai, puis on s'inscrit">
      <div className="prose">
        <p>
          Les adhésions ont lieu à partir du 1<sup>er</sup> septembre de chaque année et sont ouvertes pour la
          saison 2026-2027. Après une séance d'essai, l'inscription se fait en ligne ; elle se règle par carte
          bancaire, ou à défaut par virement ou chèque à l'ordre de la SAM Paris 12.
        </p>
      </div>
      <div className="join">
        <div className="join-head">
          <b>Cotisation saison 2026 – 2027</b>
          <span className="price"><strong>120 €</strong> / an</span>
        </div>
        <ul>
          <li>Running (toutes compétitions : cross, route, trails, championnats), MNS ou Marche Loisir — même tarif</li>
          <li>Licence FFA, assurance et adhésion à l'association incluses, parmi les plus modiques des clubs d'athlétisme de Paris</li>
          <li>Plus de certificat médical : un questionnaire de santé à remplir sur le site de la FFA après le règlement</li>
          <li>Entraînements encadrés par des entraîneurs diplômés et bénévoles</li>
          <li>Tarif préférentiel chez notre partenaire Team Outdoor</li>
        </ul>
        <div className="join-foot">
          <Link className="btn btn--solid" to="/adhesion/paiement">Payer ma cotisation en ligne →</Link>
          <a className="btn btn--ghost" href="https://samparis12.org/private/adhesion.php" target="_blank" rel="noreferrer">Formulaire d'adhésion en ligne</a>
        </div>
      </div>
      <div className="prose">
        <h2>À savoir</h2>
        <ul>
          <li>Séances d'essai complètes pour cette saison : pour rejoindre le club, écrire à contact@samparis12.org.</li>
          <li>Débutant(e)s : une intégration en cours de saison peut s'avérer compliquée. À partir du 1<sup>er</sup> octobre, merci de contacter le club au préalable (contact@samparis12.org ou 07 82 18 08 90).</li>
          <li>Marche nordique : contacter entraineurmns@samparis12.org, ou voir la page <Link to="/marche-nordique">Marche nordique</Link>.</li>
        </ul>
      </div>
    </Page>
  )
}

export function ContactPage() {
  return (
    <Page eyebrow="Contact" title="Nous rejoindre sur le terrain">
      <div className="prose">
        <p>
          Le plus simple : venir un soir de séance au stade Léo Lagrange ou écrire au club, on vous met en
          relation avec le bon groupe.
        </p>
      </div>
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
          <dt>Par courrier</dt>
          <dd>SAM Paris 12<br />9, allée des vergers – boîte n° 10<br />75012 Paris</dd>
        </div>
        <div>
          <dt>Marche nordique</dt>
          <dd><a href="mailto:entraineurmns@samparis12.org">entraineurmns@samparis12.org</a></dd>
        </div>
        <div>
          <dt>Suivre le club</dt>
          <dd><a href="https://www.facebook.com/SamParis12/" target="_blank" rel="noreferrer">Facebook</a></dd>
        </div>
        <div>
          <dt>Accès</dt>
          <dd>Métro 8 — Porte de Charenton<br />Tram T3a — Porte de Charenton</dd>
        </div>
      </dl>
    </Page>
  )
}

export function NousYetionsPage() {
  return (
    <Page eyebrow="Compétition" title="Nous y étions">
      <div className="prose">
        <p>Retour en images et en récits sur les grands rendez-vous du club.</p>
      </div>
      <div className="journal">
        {SITE.nousYetions.map((e) => (
          <article key={e.titre} className="journal-entry">
            <h2>{e.titre}</h2>
            {e.items.map((it, i) => {
              if (it.t === 'img') {
                return <img key={i} src={it.src} alt="" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none' }} />
              }
              return (
                <p key={i}>
                  {it.segs.map((g, j) => (
                    <span key={j}>
                      {j > 0 && ' '}
                      {g.href ? <a href={g.href} target="_blank" rel="noreferrer">{g.text}</a> : g.text}
                    </span>
                  ))}
                </p>
              )
            })}
          </article>
        ))}
      </div>
      <p className="note">Photos et albums hébergés sur le site actuel du club et chez des tiers (état au {SITE.instantane}) : certains peuvent disparaître.</p>
    </Page>
  )
}
