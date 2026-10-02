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
