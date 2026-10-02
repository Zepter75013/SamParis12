import { Link } from 'react-router-dom'
import ContentBlocks from '../components/ContentBlocks.jsx'
import { Legs, sectionsFromBlocks } from '../components/Legs.jsx'
import { SITE } from '../data/siteContent.js'

// Gabarit commun : titre de page, introduction, puis un parcours de bornes
// (une borne numérotée par section), comme sur l'accueil.
function Page({ eyebrow, title, intro, sections, note }) {
  return (
    <main>
      <div className="shell page-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {intro && <div className="prose">{intro}</div>}
      </div>
      <Legs sections={sections} />
      {note && <div className="shell"><p className="note">{note}</p></div>}
    </main>
  )
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function monthLabel(iso) {
  const label = new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Texte structuré -> une borne par section (titre du niveau demandé).
function ArticlePage({ eyebrow, title, blocks, level, split }) {
  const sections = sectionsFromBlocks(blocks, level).map((s) => {
    const parts = split ? split(s.title) : { title: s.title }
    return { ...parts, children: <ContentBlocks blocks={s.blocks} /> }
  })
  return <Page eyebrow={eyebrow} title={title} sections={sections} />
}

// « Chapitre I – Naissance du club » -> surtitre « Chapitre I », titre « Naissance du club »
function splitChapter(t) {
  const m = t && t.match(/^(Chapitre [IVX]+)\s*[–-]\s*(.*)$/)
  return m ? { eyebrow: m[1], title: m[2] } : { title: t }
}

export const HistoirePage = () => (
  <ArticlePage eyebrow="Le club" title="Histoire du club" blocks={SITE.histoire} level="h2" split={splitChapter} />
)
export const HorairesPage = () => (
  <ArticlePage eyebrow="Le club" title="Horaires et lieux" blocks={SITE.horaires} level="h2" />
)
export const TerrainPage = () => (
  <ArticlePage eyebrow="Le club" title="Notre terrain de jeu" blocks={SITE.terrain} level="h2" />
)
export const MarcheNordiquePage = () => (
  <ArticlePage eyebrow="Disciplines" title="Marche nordique" blocks={SITE.marcheNordique} level="h3" />
)

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
  const textSections = sectionsFromBlocks(SITE.leClub, 'h3').map((s) => ({
    title: s.title,
    children: <ContentBlocks blocks={s.blocks} />,
  }))
  const sections = [
    ...textSections,
    {
      title: 'Nos programmes',
      wide: true,
      children: (
        <>
          <p className="lead-note">
            Chaque adhérent choisit son programme selon ses objectifs, avec un plan d'entraînement mis à jour
            chaque trimestre par les entraîneurs.
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
              <p>Mardi, jeudi, samedi et dimanche, encadrée par des entraîneurs diplômés. <Link to="/marche-nordique">En savoir plus →</Link></p>
            </article>
          </div>
        </>
      ),
    },
    { title: "Conseil d'administration", wide: true, children: <People list={SITE.conseil} /> },
    {
      title: 'Nos entraîneurs',
      wide: true,
      children: (
        <>
          <p className="lead-note">Ils ont leur diplôme d'entraîneur de la FFA, ils sont entièrement bénévoles, et ils sont présents à toutes les séances d'entraînement…</p>
          <People list={SITE.entraineurs} />
        </>
      ),
    },
    {
      title: `Effectifs au ${SITE.effectifsDate}`,
      children: (
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
      ),
    },
    { title: `Pyramide des âges au ${SITE.effectifsDate}`, wide: true, children: <Pyramide /> },
  ]
  return <Page eyebrow="Qui sommes-nous" title="Le club" sections={sections} />
}

const SNAPSHOT_NOTE = `Données reprises du site actuel du club (état au ${SITE.instantane}).`

function groupBy(list, keyOf) {
  const groups = []
  for (const item of list) {
    const k = keyOf(item)
    const g = groups.find((x) => x.key === k)
    if (g) g.items.push(item)
    else groups.push({ key: k, items: [item] })
  }
  return groups
}

export function NosCoursesPage() {
  const today = new Date().toISOString().slice(0, 10)
  const rows = SITE.prochainesCourses.filter((c) => c.iso >= today).sort((a, b) => (a.iso < b.iso ? -1 : 1))
  const sections = groupBy(rows, (c) => c.iso.slice(0, 7)).map((g) => ({
    eyebrow: `${g.items.length} course${g.items.length > 1 ? 's' : ''}`,
    title: monthLabel(g.items[0].iso),
    wide: true,
    children: (
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Type</th><th>Course</th><th className="num">Inscrits SAM</th></tr></thead>
          <tbody>
            {g.items.map((c) => (
              <tr key={c.iso + c.titre}>
                <td>{formatDate(c.iso)}</td>
                <td>{c.type}</td>
                <td>{c.url ? <a href={c.url} target="_blank" rel="noreferrer">{c.titre}</a> : c.titre}</td>
                <td className="num">{c.inscrits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  }))
  sections.push({
    eyebrow: 'Notre course',
    title: 'Les Foulées du 12ème',
    children: (
      <p className="lead-note">
        Depuis 2005, le club organise les Foulées du 12<sup>e</sup>, anciennes Foulées d'Aligre : une course
        organisée par des coureurs pour des coureurs. Inscriptions et résultats des éditions passées sur{' '}
        <a href="http://foulees.samparis12.org/" target="_blank" rel="noreferrer" style={{ color: 'var(--vermilion)' }}>foulees.samparis12.org</a>.
      </p>
    ),
  })
  return (
    <Page
      eyebrow="Compétition"
      title="Nos prochaines courses"
      intro={<p>Nos coureurs sont inscrits à de nombreuses compétitions sur les mois à venir. Voici celles ayant plus de 5 inscrits SAM Paris 12.</p>}
      sections={sections}
      note={SNAPSHOT_NOTE}
    />
  )
}

export function NosResultatsPage() {
  const rows = [...SITE.derniersResultats].sort((a, b) => (a.iso < b.iso ? 1 : -1))
  const sections = groupBy(rows, (r) => r.iso.slice(0, 7)).map((g) => ({
    eyebrow: `${g.items.length} course${g.items.length > 1 ? 's' : ''}`,
    title: monthLabel(g.items[0].iso),
    wide: true,
    children: (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Course</th><th className="num">Classés SAM</th><th className="num">Meilleur samien</th></tr>
          </thead>
          <tbody>
            {g.items.map((r) => (
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
    ),
  }))
  return (
    <Page
      eyebrow="Compétition"
      title="Nos derniers résultats"
      intro={<p>Voici les participations les plus importantes et les résultats les plus significatifs de nos coureurs.</p>}
      sections={sections}
      note={SNAPSHOT_NOTE}
    />
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

const RECORD_GROUPS = [
  { title: 'Route', eyebrow: '5 km à 20 km', match: (e) => /^(5|10|15|20) km/.test(e) },
  { title: 'Semi-marathon et marathon', eyebrow: 'Grandes distances', match: (e) => /marathon/i.test(e) },
  { title: 'Ultra', eyebrow: '50 km et 100 km', match: (e) => /^(50|100) km/.test(e) },
  { title: 'Piste', eyebrow: '800 m à 10 000 m', match: (e) => /^Piste/.test(e) },
]

export function NosPerformancesPage() {
  const sections = RECORD_GROUPS
    .map((g) => ({ g, rows: SITE.records.filter((r) => g.match(r.epreuve)) }))
    .filter(({ rows }) => rows.length > 0)
    .map(({ g, rows }) => ({
      eyebrow: g.eyebrow,
      title: g.title,
      wide: true,
      children: (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Épreuve</th><th>Féminin</th><th>Masculin</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.epreuve}>
                  <th scope="row">{r.epreuve}</th>
                  <RecordCell rec={r.femme} />
                  <RecordCell rec={r.homme} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    }))
  return (
    <Page
      eyebrow="Compétition"
      title="Nos meilleures performances"
      intro={<p>Records du club depuis 2000.</p>}
      sections={sections}
      note={SNAPSHOT_NOTE}
    />
  )
}

export function AdhesionPage() {
  const sections = [
    {
      eyebrow: 'Saison 2026 – 2027',
      title: 'Une cotisation, tout compris',
      children: (
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
      ),
    },
    {
      title: "Comment s'inscrire",
      children: (
        <div className="prose">
          <p>
            Les adhésions ont lieu à partir du 1<sup>er</sup> septembre de chaque année et sont ouvertes pour la
            saison 2026-2027.
          </p>
          <ul>
            <li>Participer à une séance d'essai.</li>
            <li>Remplir le formulaire d'adhésion en ligne.</li>
            <li>Régler la cotisation par carte bancaire, ou à défaut par virement ou chèque à l'ordre de la SAM Paris 12.</li>
            <li>Remplir le questionnaire de santé sur le site de la FFA.</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'À savoir',
      children: (
        <div className="prose">
          <ul>
            <li>Séances d'essai complètes pour cette saison : pour rejoindre le club, écrire à contact@samparis12.org.</li>
            <li>Débutant(e)s : une intégration en cours de saison peut s'avérer compliquée. À partir du 1<sup>er</sup> octobre, merci de contacter le club au préalable (contact@samparis12.org ou 07 82 18 08 90).</li>
            <li>Marche nordique : contacter entraineurmns@samparis12.org, ou voir la page <Link to="/marche-nordique">Marche nordique</Link>.</li>
          </ul>
        </div>
      ),
    },
  ]
  return <Page eyebrow="Adhésion au club" title="Une séance d'essai, puis on s'inscrit" sections={sections} />
}

export function ContactPage() {
  const sections = [
    {
      title: 'Venir nous voir',
      children: (
        <>
          <p className="lead-note">Le plus simple : venir un soir de séance au stade Léo Lagrange, on vous met en relation avec le bon groupe.</p>
          <dl className="contact-grid">
            <div>
              <dt>Entraînements</dt>
              <dd>Stade Léo Lagrange<br />Boulevard Poniatowski<br />75012 Paris — Porte de Charenton</dd>
            </div>
            <div>
              <dt>Accès</dt>
              <dd>Métro 8 — Porte de Charenton<br />Tram T3a — Porte de Charenton</dd>
            </div>
          </dl>
        </>
      ),
    },
    {
      title: 'Nous écrire',
      children: (
        <dl className="contact-grid">
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
        </dl>
      ),
    },
    {
      title: 'Nous suivre',
      children: (
        <dl className="contact-grid">
          <div>
            <dt>Réseaux</dt>
            <dd><a href="https://www.facebook.com/SamParis12/" target="_blank" rel="noreferrer">Facebook</a></dd>
          </div>
          <div>
            <dt>Les Foulées du 12ème</dt>
            <dd><a href="http://foulees.samparis12.org/" target="_blank" rel="noreferrer">foulees.samparis12.org</a></dd>
          </div>
        </dl>
      ),
    },
  ]
  return <Page eyebrow="Contact" title="Nous rejoindre sur le terrain" sections={sections} />
}

function yearOf(titre) {
  const m = titre.match(/\b(19|20)\d{2}\b/)
  return m ? m[0] : 'Autres'
}

export function NousYetionsPage() {
  const sections = groupBy(SITE.nousYetions, (e) => yearOf(e.titre)).map((g) => ({
    eyebrow: `${g.items.length} souvenir${g.items.length > 1 ? 's' : ''}`,
    title: g.key,
    children: (
      <div className="journal">
        {g.items.map((e) => (
          <article key={e.titre} className="journal-entry">
            <h3>{e.titre}</h3>
            {e.items.map((it, i) => {
              if (it.t === 'img') {
                return <img key={i} src={it.src} alt="" loading="lazy" onError={(ev) => { ev.currentTarget.style.display = 'none' }} />
              }
              return (
                <p key={i}>
                  {it.segs.map((s, j) => (
                    <span key={j}>
                      {j > 0 && ' '}
                      {s.href ? <a href={s.href} target="_blank" rel="noreferrer">{s.text}</a> : s.text}
                    </span>
                  ))}
                </p>
              )
            })}
          </article>
        ))}
      </div>
    ),
  }))
  return (
    <Page
      eyebrow="Compétition"
      title="Nous y étions"
      intro={<p>Retour en images et en récits sur les grands rendez-vous du club.</p>}
      sections={sections}
      note={`Photos et albums hébergés sur le site actuel du club et chez des tiers (état au ${SITE.instantane}) : certains peuvent disparaître.`}
    />
  )
}
