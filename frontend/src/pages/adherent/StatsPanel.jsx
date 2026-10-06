import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

// Statistiques du club. Chaque section (effectifs, courses, engagement) n'est proposée que si le rôle de l'adhérent a la
// fonctionnalité correspondante ; le serveur refuse de toute façon les sections non autorisées.

const nf = new Intl.NumberFormat('fr-FR')
const fmt = (n) => nf.format(n ?? 0)
const fmt1 = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n ?? 0)
const pct = (n, total) => (total > 0 ? `${Math.round((n / total) * 100)} %` : '—')

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const libelleMois = (ym) => {
  const [a, m] = ym.split('-')
  return `${MOIS[Number(m) - 1] || m} ${a.slice(2)}`
}
const libelleJour = (ymd) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`
const fmtDate = (ymd) => (ymd ? new Date(`${ymd}T12:00:00`).toLocaleDateString('fr-FR') : '—')
const fmtTemps = (s) => {
  if (s == null) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// Les mois sans résultat n'existent pas dans les données : on les ajoute à zéro pour que l'axe du temps soit continu.
function completerMois(data) {
  if (data.length < 2) return data
  const par = new Map(data.map((d) => [d.label, d.n]))
  const out = []
  let [a, m] = data[0].label.split('-').map(Number)
  const [fa, fm] = data[data.length - 1].label.split('-').map(Number)
  while (a < fa || (a === fa && m <= fm)) {
    const k = `${a}-${String(m).padStart(2, '0')}`
    out.push({ label: k, n: par.get(k) || 0 })
    if (++m > 12) { m = 1; a++ }
  }
  return out
}

const SECTIONS = [
  { id: 'effectifs', feature: 'stats.effectifs', label: 'Effectifs' },
  { id: 'courses', feature: 'stats.courses', label: 'Courses' },
  { id: 'engagement', feature: 'stats.engagement', label: 'Engagement' },
]

function Carte({ valeur, label, note }) {
  return (
    <div className="stats-carte">
      <b>{valeur}</b>
      <span>{label}</span>
      {note && <small>{note}</small>}
    </div>
  )
}

// Barres horizontales : une ligne par valeur, avec la part du total.
function Barres({ data, titre, total, unite = '', large = false, vide = 'Aucune donnée.' }) {
  const max = Math.max(1, ...data.map((d) => d.n))
  const somme = total ?? data.reduce((s, d) => s + d.n, 0)
  return (
    <section className={`stats-bloc${large ? ' stats-bloc--large' : ''}`}>
      {titre && <h3>{titre}</h3>}
      {data.length === 0 ? <p className="stats-vide">{vide}</p> : (
        <ul className="stats-barres">
          {data.map((d) => (
            <li key={d.label}>
              <span className="stats-barres__label" title={d.label}>{d.label}</span>
              <span className="stats-barres__piste"><i style={{ width: `${(d.n / max) * 100}%` }} /></span>
              <span className="stats-barres__val">{fmt(d.n)}{unite}{somme > 0 && total !== 0 ? <small> · {pct(d.n, somme)}</small> : null}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Colonnes en SVG (évolution dans le temps) ; une étiquette sur n pour rester lisible.
function Colonnes({ data, titre, libelle = (l) => l, note, vide = 'Aucune donnée.' }) {
  const W = 640
  const H = 170
  const bas = 26
  const haut = 16
  const max = Math.max(1, ...data.map((d) => d.n))
  const pas = W / Math.max(data.length, 1)
  const larg = Math.max(2, Math.min(34, pas * 0.68))
  const saut = Math.ceil((data.length * 56) / W) // une étiquette tous les ~56 unités
  return (
    <section className="stats-bloc stats-bloc--large">
      {titre && <h3>{titre}</h3>}
      {data.length === 0 ? <p className="stats-vide">{vide}</p> : (
        <div className="stats-colonnes-wrap"><svg className="stats-colonnes" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titre}>
          <line x1="0" x2={W} y1={H - bas} y2={H - bas} className="stats-axe" />
          {data.map((d, i) => {
            const h = ((H - bas - haut) * d.n) / max
            const x = i * pas + (pas - larg) / 2
            return (
              <g key={d.label}>
                <rect x={x} y={H - bas - h} width={larg} height={Math.max(h, d.n > 0 ? 1.5 : 0)} className="stats-col">
                  <title>{`${libelle(d.label)} : ${fmt(d.n)}`}</title>
                </rect>
                {d.n > 0 && data.length <= 14 && <text x={x + larg / 2} y={H - bas - h - 4} textAnchor="middle" className="stats-val">{fmt(d.n)}</text>}
                {i % saut === 0 && <text x={x + larg / 2} y={H - 8} textAnchor="middle" className="stats-lib">{libelle(d.label)}</text>}
              </g>
            )
          })}
        </svg></div>
      )}
      {note && <p className="stats-note">{note}</p>}
    </section>
  )
}

async function telecharger(token, chemin, setErreur) {
  try {
    await api.downloadFile(token, chemin)
  } catch (e) {
    setErreur(e.message)
  }
}

// Charge une section ; une requête plus récente rend la précédente caduque.
function useSection(section, token, params) {
  const [etat, setEtat] = useState({ data: null, erreur: '', chargement: true })
  const n = useRef(0)
  const cle = JSON.stringify(params)
  const charger = () => {
    const id = ++n.current
    setEtat((e) => ({ ...e, erreur: '', chargement: true }))
    api.getStats(token, section, params)
      .then((data) => { if (id === n.current) setEtat({ data, erreur: '', chargement: false }) })
      .catch((e) => { if (id === n.current) setEtat({ data: null, erreur: e.message, chargement: false }) })
  }
  useEffect(() => { charger() }, [section, token, cle]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...etat, recharger: charger }
}

function Etat({ etat, children }) {
  if (etat.erreur) return <p className="roles-erreur">{etat.erreur} <button type="button" className="btn btn--ghost roles-btn" onClick={etat.recharger}>Réessayer</button></p>
  if (etat.chargement && !etat.data) return <p className="stats-vide">Chargement…</p>
  if (!etat.data) return null
  return <div className={etat.chargement ? 'stats-actualise' : ''}>{children(etat.data)}</div>
}

// ---- Effectifs ----

function Effectifs({ token }) {
  const etat = useSection('effectifs', token, {})
  return (
    <Etat etat={etat}>
      {(d) => (
        <>
          <div className="stats-cartes">
            <Carte valeur={fmt(d.total)} label="Adhérents en base" />
            {d.saisonCourante > 0 && <Carte valeur={fmt(d.aJour)} label={`À jour de la saison ${d.saisonCourante}`} note={pct(d.aJour, d.total)} />}
            {d.saisonCourante > 0 && <Carte valeur={fmt(d.nouveaux)} label="Nouveaux cette saison" note="première adhésion" />}
            <Carte valeur={d.ageMoyen != null ? `${fmt1(d.ageMoyen)} ans` : '—'} label="Âge moyen" note="dates de naissance renseignées" />
          </div>
          <div className="stats-grille">
            <Barres titre="Par statut" data={d.statuts} />
            <Barres titre="Par groupe" data={d.groupes} />
            <Barres titre="Femmes / hommes" data={d.sexes} />
            <Barres titre="Par tranche d'âge" data={d.ages} />
            <Colonnes titre="Nouveaux adhérents par année" data={d.premiereAdhesion} note="Année de première adhésion." />
            <Colonnes titre="Dernière adhésion enregistrée" data={d.derniereAdhesion} note="Les années anciennes correspondent aux adhérents qui n'ont pas renouvelé." />
          </div>
        </>
      )}
    </Etat>
  )
}

// ---- Courses ----

function Courses({ token }) {
  const [saison, setSaison] = useState(0)
  const [erreurCsv, setErreurCsv] = useState('')
  const etat = useSection('courses', token, saison ? { saison } : {})
  return (
    <>
      <div className="stats-filtre">
        <label>Saison
          <select className="roles-select" value={saison} onChange={(e) => setSaison(Number(e.target.value))}>
            <option value={0}>Toutes les saisons</option>
            {(etat.data?.saisons || []).map((s) => <option key={s} value={s}>{s}-{s + 1}</option>)}
          </select>
        </label>
        <small>Une saison va du 1er septembre au 31 août.</small>
      </div>
      {erreurCsv && <p className="roles-erreur">{erreurCsv}</p>}
      <Etat etat={etat}>
        {(d) => (
          <>
            <div className="stats-cartes">
              <Carte valeur={fmt(d.resultats)} label="Résultats saisis" note={`${fmt(d.classes)} adhérent${d.classes > 1 ? 's' : ''}`} />
              <Carte valeur={`${fmt(d.avecResultats)} / ${fmt(d.courses)}`} label="Courses avec résultats" />
              <Carte valeur={`${fmt(Math.round(d.km))} km`} label="Kilomètres courus" note="distance des courses terminées" />
              <Carte valeur={fmt(d.podiumsCategorie)} label="Podiums de catégorie" note={`${fmt(d.podiumsGeneral)} au classement général`} />
              <Carte valeur={fmt(d.inscriptionsAVenir)} label="Inscriptions à venir" />
            </div>
            <div className="stats-grille">
              <Barres titre="Résultats par type de course" data={d.parType} total={d.resultats} large />
              <Colonnes titre="Résultats par mois" data={completerMois(d.parMois)} libelle={libelleMois} />
            </div>

            <section className="stats-bloc">
              <h3>Participation par course</h3>
              {d.lignes.length === 0 ? <p className="stats-vide">Aucune course avec inscrits ou résultats sur cette période.</p> : (
                <div className="stats-table-wrap">
                  <table className="stats-table">
                    <thead><tr><th>Date</th><th>Course</th><th>Type</th><th className="num">Km</th><th className="num">Inscrits</th><th className="num">Classés</th><th className="num">Meilleure place</th><th className="num">Meilleur temps</th></tr></thead>
                    <tbody>
                      {d.lignes.map((l) => (
                        <tr key={l.id}>
                          <td>{fmtDate(l.date)}</td>
                          <td>{l.titre}{l.lieu ? <small> · {l.lieu}</small> : null}</td>
                          <td>{l.type || '—'}</td>
                          <td className="num">{l.distanceKm ? fmt1(l.distanceKm) : '—'}</td>
                          <td className="num">{fmt(l.inscrits)}</td>
                          <td className="num">{fmt(l.classes)}</td>
                          <td className="num">{l.meilleurClassement ?? '—'}</td>
                          <td className="num">{fmtTemps(l.meilleurTemps)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {d.lignes.length >= 200 && <p className="stats-note">Les 200 courses les plus récentes sont affichées.</p>}
            </section>

            <section className="stats-bloc">
              <div className="stats-bloc__entete">
                <h3>Assiduité des adhérents <span className="stats-nominatif">liste nominative</span></h3>
                <button type="button" className="btn btn--ghost roles-btn" disabled={d.assidus.length === 0}
                  onClick={() => telecharger(token, `/stats/courses/assiduite.csv${saison ? `?saison=${saison}` : ''}`, setErreurCsv)}>
                  Exporter la liste complète (CSV)
                </button>
              </div>
              {d.assidus.length === 0 ? <p className="stats-vide">Aucun résultat saisi sur cette période.</p> : (
                <div className="stats-table-wrap">
                  <table className="stats-table">
                    <thead><tr><th className="num">#</th><th>Adhérent</th><th>Groupe</th><th className="num">Courses</th><th className="num">Km</th><th className="num">Podiums</th><th>Dernière course</th></tr></thead>
                    <tbody>
                      {d.assidus.map((a, i) => (
                        <tr key={`${a.nom}-${i}`}>
                          <td className="num">{i + 1}</td><td>{a.nom}</td><td>{a.groupe || '—'}</td>
                          <td className="num">{fmt(a.courses)}</td><td className="num">{fmt1(a.km)}</td><td className="num">{fmt(a.podiums)}</td><td>{fmtDate(a.derniere)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="stats-note">Les 20 premiers sont affichés ; l'export contient tous les adhérents ayant un résultat.</p>
            </section>
          </>
        )}
      </Etat>
    </>
  )
}

// ---- Engagement ----

function Engagement({ token }) {
  const etat = useSection('engagement', token, {})
  const [q, setQ] = useState('')
  const [manque, setManque] = useState('')
  const [erreurCsv, setErreurCsv] = useState('')
  const liste = useMemo(() => {
    const incompletes = etat.data?.fiches.incompletes || []
    const mot = q.trim().toLowerCase()
    return incompletes.filter((f) => (!manque || f.manques.includes(manque)) && (!mot || f.nom.toLowerCase().includes(mot)))
  }, [etat.data, q, manque])

  return (
    <>
      {erreurCsv && <p className="roles-erreur">{erreurCsv}</p>}
      <Etat etat={etat}>
        {(d) => (
          <>
            <h3 className="stats-titre">Comptes de l'espace adhérent</h3>
            <div className="stats-cartes">
              <Carte valeur={fmt(d.comptes.actives)} label="Comptes activés" note={pct(d.comptes.actives, d.comptes.total)} />
              <Carte valeur={fmt(d.comptes.invites)} label="Invités, pas encore activés" note="email de bienvenue envoyé" />
              <Carte valeur={fmt(d.comptes.nonInvites)} label="Jamais invités" note="aucun email de bienvenue" />
              <Carte valeur={fmt(d.connexions.actifs7j)} label="Connectés sur 7 jours" note="adhérents distincts" />
              <Carte valeur={fmt(d.connexions.actifs30j)} label="Connectés sur 30 jours" note={`${fmt(d.connexions.total30j)} connexions`} />
            </div>
            <Colonnes titre="Adhérents connectés par jour (30 derniers jours)" data={d.connexions.parJour} libelle={libelleJour}
              note={d.connexions.depuisLe ? `Le journal d'activité compte les connexions depuis le ${fmtDate(d.connexions.depuisLe)}.` : 'Aucune connexion enregistrée pour le moment.'} />

            <h3 className="stats-titre">Messagerie et jeu</h3>
            <div className="stats-cartes">
              <Carte valeur={fmt(d.messagerie.messages30j)} label="Messages sur 30 jours" note="salons et messages privés" />
              <Carte valeur={fmt(d.messagerie.expediteurs30j)} label="Adhérents qui ont écrit" />
              <Carte valeur={fmt(d.messagerie.salons30j)} label="Discussions actives" />
              <Carte valeur={fmt(d.jeu.joueurs)} label="Joueurs de SAM Run" note={d.jeu.record ? `record : ${fmt(d.jeu.record)} m` : null} />
            </div>
            <Barres titre="Salons les plus actifs (30 jours)" data={d.messagerie.topSalons} large vide="Aucun message sur les 30 derniers jours." />

            <h3 className="stats-titre">Qualité des fiches adhérents</h3>
            <div className="stats-cartes">
              <Carte valeur={fmt(d.fiches.completes)} label="Fiches complètes" note={`sur ${fmt(d.fiches.evaluees)} (hors anciens adhérents)`} />
              <Carte valeur={fmt(d.fiches.incompletes.length)} label="Fiches incomplètes" note={pct(d.fiches.incompletes.length, d.fiches.evaluees)} />
            </div>
            <Barres titre="Informations manquantes" data={d.fiches.parManque} total={d.fiches.evaluees} large />

            <section className="stats-bloc">
              <div className="stats-bloc__entete">
                <h3>Fiches à compléter <span className="stats-nominatif">liste nominative</span></h3>
                <button type="button" className="btn btn--ghost roles-btn" disabled={d.fiches.incompletes.length === 0}
                  onClick={() => telecharger(token, '/stats/engagement/fiches.csv', setErreurCsv)}>
                  Exporter en CSV
                </button>
              </div>
              <div className="stats-filtre">
                <label>Recherche<input className="roles-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom…" /></label>
                <label>Information manquante
                  <select className="roles-select" value={manque} onChange={(e) => setManque(e.target.value)}>
                    <option value="">Toutes</option>
                    {d.fiches.parManque.map((m) => <option key={m.label} value={m.label}>{m.label} ({m.n})</option>)}
                  </select>
                </label>
              </div>
              {liste.length === 0 ? <p className="stats-vide">{d.fiches.incompletes.length === 0 ? 'Toutes les fiches sont complètes.' : 'Aucune fiche ne correspond.'}</p> : (
                <div className="stats-table-wrap">
                  <table className="stats-table">
                    <thead><tr><th>Adhérent</th><th>Groupe</th><th>Statut</th><th>Informations manquantes</th></tr></thead>
                    <tbody>
                      {liste.map((f) => (
                        <tr key={f.id}><td>{f.nom}</td><td>{f.groupe || '—'}</td><td>{f.statut || '—'}</td><td>{f.manques.join(', ')}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="stats-note">{fmt(liste.length)} fiche{liste.length > 1 ? 's' : ''} affichée{liste.length > 1 ? 's' : ''}.</p>
            </section>
          </>
        )}
      </Etat>
    </>
  )
}

export default function StatsPanel({ token, can }) {
  const permises = SECTIONS.filter((s) => can(s.feature))
  const [section, setSection] = useState(() => permises[0]?.id)
  const courante = permises.find((s) => s.id === section) || permises[0]
  if (!courante) return <p style={{ color: 'var(--stone)' }}>Cette section est réservée aux adhérents dont le rôle comprend une fonctionnalité « Statistiques ».</p>

  return (
    <div className="statpanel">
      <div style={{ marginBottom: '1.2rem' }}>
        <span className="eyebrow">Réservé aux rôles autorisés</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Statistiques</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Les chiffres sont calculés en direct à partir des adhérents, des courses, de la messagerie et du journal d'activité.
          Vous ne voyez que les rubriques que votre rôle autorise ; la consultation des listes nominatives et leur export sont tracés dans le journal d'activité.
        </p>
      </div>
      {permises.length > 1 && (
        <div className="stats-onglets" role="tablist">
          {permises.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === courante.id} className={s.id === courante.id ? 'active' : ''} onClick={() => setSection(s.id)}>{s.label}</button>
          ))}
        </div>
      )}
      {courante.id === 'effectifs' && <Effectifs token={token} />}
      {courante.id === 'courses' && <Courses token={token} />}
      {courante.id === 'engagement' && <Engagement token={token} />}
    </div>
  )
}
