import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import Bascule from '../../components/Bascule.jsx'
import ChampDate from '../../components/ChampDate.jsx'
import TraceMini from '../../components/TraceMini.jsx'

const CarteTrace = lazy(() => import('./CarteTrace.jsx'))

// « Mon activité » : l'adhérent relie son compte Strava et consulte ses propres activités. Conformément aux règles de
// l'API Strava, ces données ne sont visibles que de lui : aucun autre adhérent (ni le bureau) n'y a accès.

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

const SPORTS = {
  Run: ['🏃', 'Course à pied', 'allure'], TrailRun: ['⛰️', 'Trail', 'allure'], VirtualRun: ['🏃', 'Course virtuelle', 'allure'],
  Walk: ['🚶', 'Marche', 'allure'], Hike: ['🥾', 'Randonnée', 'allure'],
  Ride: ['🚴', 'Vélo', 'vitesse'], GravelRide: ['🚴', 'Vélo gravel', 'vitesse'], MountainBikeRide: ['🚵', 'VTT', 'vitesse'],
  EBikeRide: ['🚴', 'Vélo électrique', 'vitesse'], VirtualRide: ['🚴', 'Vélo virtuel', 'vitesse'],
  Swim: ['🏊', 'Natation', 'nage'], WeightTraining: ['🏋️', 'Renforcement', ''], Workout: ['💪', 'Séance', ''], Yoga: ['🧘', 'Yoga', ''],
}
const infoSport = (s) => SPORTS[s] || ['🏅', s || 'Activité', '']

// Familles de sports : une couleur par famille (liste, graphique et filtres)
const FAMILLES = {
  course: { id: 'course', label: 'Course à pied', couleur: '#DE3327' },
  trail: { id: 'trail', label: 'Trail', couleur: '#A0522D' },
  marche: { id: 'marche', label: 'Marche et randonnée', couleur: '#2F7D6D' },
  velo: { id: 'velo', label: 'Vélo', couleur: '#3B6FB6' },
  natation: { id: 'natation', label: 'Natation', couleur: '#0E9AA7' },
  renfo: { id: 'renfo', label: 'Renforcement et fitness', couleur: '#D99A1F' },
  autre: { id: 'autre', label: 'Autres sports', couleur: '#78716C' },
}
const FAMILLE_DE = {
  Run: 'course', VirtualRun: 'course', TrailRun: 'trail', Walk: 'marche', Hike: 'marche',
  Ride: 'velo', GravelRide: 'velo', MountainBikeRide: 'velo', EBikeRide: 'velo', EMountainBikeRide: 'velo', VirtualRide: 'velo', Handcycle: 'velo', Velomobile: 'velo',
  Swim: 'natation', WeightTraining: 'renfo', Workout: 'renfo', Yoga: 'renfo', Crossfit: 'renfo', HighIntensityIntervalTraining: 'renfo', Pilates: 'renfo',
}
const famille = (sport) => FAMILLES[FAMILLE_DE[sport]] || FAMILLES.autre
const ORDRE_FAMILLES = Object.keys(FAMILLES)

// Éclaircit (k > 1) ou assombrit (k < 1) une couleur #RRGGBB, pour les faces du dessus et du côté des colonnes 3D.
function teinte(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)))).toString(16).padStart(2, '0')
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}

// Colonnes 3D empilées : chaque colonne se décompose par famille de sport (une couleur chacune).
function ColonnesEmpilees({ data, titre, libelle, familles }) {
  const W = 640
  const H = 180
  const bas = 26
  const haut = 24
  const max = Math.max(1, ...data.map((d) => d.total))
  const pas = W / Math.max(data.length, 1)
  const larg = Math.max(2, Math.min(34, pas * 0.62))
  const prof = Math.min(7, larg * 0.4) // profondeur de la colonne (effet 3D)
  const saut = Math.ceil((data.length * 56) / W)
  return (
    <section className="stats-bloc stats-bloc--large">
      <h3>{titre}</h3>
      <div className="stats-colonnes-wrap">
        <svg className="stats-colonnes" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titre}>
          <line x1="0" x2={W} y1={H - bas} y2={H - bas} className="stats-axe" />
          {data.map((d, i) => {
            const x = i * pas + (pas - larg - prof) / 2
            const segs = familles.filter((f) => d.parts[f.id] > 0)
            let y = H - bas
            return (
              <g key={d.label}>
                {segs.map((f, k) => {
                  const h = Math.max(((H - bas - haut) * d.parts[f.id]) / max, 1)
                  const y0 = y
                  y -= h
                  const dernier = k === segs.length - 1
                  return (
                    <g key={f.id} className="strava-seg">
                      <polygon points={`${x + larg},${y} ${x + larg + prof},${y - prof} ${x + larg + prof},${y0 - prof} ${x + larg},${y0}`} fill={teinte(f.couleur, 0.72)} />
                      {dernier && <polygon points={`${x},${y} ${x + prof},${y - prof} ${x + larg + prof},${y - prof} ${x + larg},${y}`} fill={teinte(f.couleur, 1.3)} />}
                      <rect x={x} y={y} width={larg} height={h} fill={f.couleur} />
                      <title>{`${libelle(d.label)} · ${f.label} : ${nf.format(d.parts[f.id])} km`}</title>
                    </g>
                  )
                })}
                {d.total > 0 && data.length <= 14 && <text x={x + (larg + prof) / 2} y={y - prof - 4} textAnchor="middle" className="stats-val">{nf.format(d.total)}</text>}
                {i % saut === 0 && <text x={x + (larg + prof) / 2} y={H - 8} textAnchor="middle" className="stats-lib">{libelle(d.label)}</text>}
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

const km = (m) => `${nf.format(m / 1000)} km`
const duree = (s) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
const allure = (ms) => {
  if (!ms) return '—'
  const sPerKm = 1000 / ms
  return `${Math.floor(sPerKm / 60)}:${String(Math.round(sPerKm % 60)).padStart(2, '0')} /km`
}
const allure100 = (ms) => {
  if (!ms) return '—'
  const s = 100 / ms
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} /100 m`
}
const vitesse = (ms) => (ms ? `${nf.format(ms * 3.6)} km/h` : '—')
const dateFr = (iso) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

// ---- dates locales (AAAA-MM-JJ), à midi pour éviter les décalages d'heure d'été ----
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (j) => new Date(`${j}T12:00:00`)
const addJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const lundiDe = (d) => addJours(d, -((d.getDay() + 6) % 7))
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const courte = (j) => { const d = parse(j); return `${d.getDate()} ${MOIS[d.getMonth()]}` }
const jourMois = (j) => `${j.slice(8, 10)}/${j.slice(5, 7)}`

// Période choisie → { from, to } (jours inclus), ou null si elle est incomplète.
function plage(mode, ref, debut, fin) {
  if (mode === 'semaine') { const l = lundiDe(ref); return { from: iso(l), to: iso(addJours(l, 6)) } }
  if (mode === 'mois') return { from: iso(new Date(ref.getFullYear(), ref.getMonth(), 1, 12)), to: iso(new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12)) }
  if (mode === 'annee') return { from: `${ref.getFullYear()}-01-01`, to: `${ref.getFullYear()}-12-31` }
  if (mode === 'dates' && debut && fin && debut <= fin) return { from: debut, to: fin }
  return null
}

function libellePlage(mode, ref, p) {
  if (!p) return ''
  if (mode === 'semaine') return `Semaine du ${courte(p.from)} au ${courte(p.to)} ${parse(p.to).getFullYear()}`
  if (mode === 'mois') return ref.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  if (mode === 'annee') return String(ref.getFullYear())
  return `Du ${courte(p.from)} ${p.from.slice(0, 4)} au ${courte(p.to)} ${p.to.slice(0, 4)}`
}

// Découpage du graphique selon la durée : par jour (≤ 5 semaines), par semaine (≤ 6 mois), sinon par mois.
function decoupage(from, to) {
  const jours = Math.round((parse(to) - parse(from)) / 86400000) + 1
  const gran = jours <= 35 ? 'jour' : jours <= 190 ? 'semaine' : 'mois'
  const cles = []
  if (gran === 'jour') for (let d = parse(from); iso(d) <= to; d = addJours(d, 1)) cles.push(iso(d))
  else if (gran === 'semaine') for (let d = lundiDe(parse(from)); iso(d) <= to; d = addJours(d, 7)) cles.push(iso(d))
  else for (let d = new Date(parse(from).getFullYear(), parse(from).getMonth(), 1, 12); iso(d) <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) cles.push(iso(d).slice(0, 7))
  const cleDe = (j) => (gran === 'jour' ? j : gran === 'semaine' ? iso(lundiDe(parse(j))) : j.slice(0, 7))
  const libelle = (c) => (gran === 'mois' ? `${MOIS[Number(c.slice(5, 7)) - 1]} ${c.slice(2, 4)}` : jourMois(c))
  return { gran, cles, cleDe, libelle }
}

const MODES = [
  { value: 'recent', label: 'Récentes' },
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
  { value: 'dates', label: 'Dates' },
]

function Totaux({ titre, t }) {
  if (!t || !t.total.nombre) return null
  const col = (nom, x) => (
    <div className="strava-tot__col">
      <span>{nom}</span>
      <b>{km(x.distanceM)}</b>
      <small>{nf0.format(x.nombre)} sortie{x.nombre > 1 ? 's' : ''} · {duree(x.dureeS)} · {nf0.format(x.denivele)} m D+</small>
    </div>
  )
  return (
    <section className="stats-bloc">
      <h3>{titre}</h3>
      <div className="strava-tot">
        {col('4 dernières semaines', t.recent)}
        {col('Cette année', t.annee)}
        {col('Depuis toujours', t.total)}
      </div>
    </section>
  )
}

export default function StravaPanel({ token, flash, onFlashClear }) {
  const [carte, setCarte] = useState(null) // activité dont le tracé est ouvert sur la carte
  const fermerCarte = useCallback(() => setCarte(null), [])
  const chargerDetail = useCallback(() => api.stravaActivite(token, carte?.id), [token, carte])
  const [statut, setStatut] = useState(null)
  const [stats, setStats] = useState(null)
  const [activites, setActivites] = useState([])
  const [suite, setSuite] = useState(false)
  const [page, setPage] = useState(1)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [occupe, setOccupe] = useState(false)
  const [filtre, setFiltre] = useState('')
  // Période affichée : activités récentes, ou une semaine / un mois / une année / des dates choisies
  const [mode, setMode] = useState('recent')
  const [ref, setRef] = useState(() => new Date())
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [periodeActs, setPeriodeActs] = useState(null)
  const [tronque, setTronque] = useState(false)
  const [chargePeriode, setChargePeriode] = useState(false)
  const requete = useRef(0)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      const s = await api.stravaStatus(token)
      setStatut(s)
      if (s.connected && s.activites) {
        // Les totaux sont facultatifs : si Strava ne les fournit pas, la liste des activités s'affiche quand même.
        const [st, ac] = await Promise.all([api.stravaStats(token).catch(() => null), api.stravaActivities(token, 1)])
        setStats(st)
        setActivites(ac.activites)
        setSuite(ac.suite)
        setPage(1)
      } else {
        setStats(null)
        setActivites([])
      }
    } catch (e) {
      setErreur(e.message)
      if (e.status === 409) setStatut((s) => (s ? { ...s, connected: false } : s))
    } finally {
      setChargement(false)
    }
  }, [token])

  // au chargement, et après le retour de Strava (flash)
  useEffect(() => { charger() }, [charger, flash])

  const periode = useMemo(() => (mode === 'recent' ? null : plage(mode, ref, debut, fin)), [mode, ref, debut, fin])
  const connecte = !!(statut && statut.connected && statut.activites)

  // Chargement de toutes les activités de la période choisie (une requête plus récente rend la précédente caduque)
  useEffect(() => {
    if (!connecte || !periode) { setPeriodeActs(null); return undefined }
    const n = ++requete.current
    setChargePeriode(true)
    setErreur('')
    api.stravaActivitesPeriode(token, periode.from, periode.to)
      .then((r) => { if (n === requete.current) { setPeriodeActs(r.activites); setTronque(!!r.tronque) } })
      .catch((e) => { if (n === requete.current) { setPeriodeActs([]); setErreur(e.message) } })
      .finally(() => { if (n === requete.current) setChargePeriode(false) })
    return undefined
  }, [connecte, periode, token])

  function decaler(sens) {
    setRef((d) => {
      if (mode === 'semaine') return addJours(d, 7 * sens)
      if (mode === 'mois') return new Date(d.getFullYear(), d.getMonth() + sens, 1, 12)
      return new Date(d.getFullYear() + sens, d.getMonth(), 1, 12)
    })
  }

  async function relier() {
    setOccupe(true)
    setErreur('')
    try {
      const { url } = await api.stravaConnect(token)
      window.location.href = url
    } catch (e) {
      setErreur(e.message)
      setOccupe(false)
    }
  }

  async function deconnecter() {
    if (!window.confirm('Déconnecter ton compte Strava ?\n\nL\'accès est révoqué chez Strava et le club ne garde plus rien. Tu pourras le relier à nouveau quand tu veux.')) return
    setOccupe(true)
    try {
      await api.stravaDisconnect(token)
      onFlashClear?.()
      await charger()
    } catch (e) {
      setErreur(e.message)
    } finally {
      setOccupe(false)
    }
  }

  async function plus() {
    setOccupe(true)
    try {
      const ac = await api.stravaActivities(token, page + 1)
      setActivites((l) => [...l, ...ac.activites])
      setSuite(ac.suite)
      setPage((p) => p + 1)
    } catch (e) {
      setErreur(e.message)
    } finally {
      setOccupe(false)
    }
  }

  const source = mode === 'recent' ? activites : (periodeActs || [])

  // Familles présentes dans la période (avec leurs totaux) : elles servent de légende et de filtres
  const presentes = useMemo(() => {
    const t = {}
    source.forEach((a) => {
      const f = famille(a.sport)
      t[f.id] = t[f.id] || { ...f, n: 0, m: 0 }
      t[f.id].n += 1
      t[f.id].m += a.distanceM
    })
    return ORDRE_FAMILLES.filter((id) => t[id]).map((id) => t[id])
  }, [source])
  const filtreActif = presentes.some((f) => f.id === filtre) ? filtre : ''
  const liste = useMemo(() => (filtreActif ? source.filter((a) => famille(a.sport).id === filtreActif) : source), [source, filtreActif])

  // Résumé de la période (ou des activités chargées)
  const resume = useMemo(() => {
    const r = { n: 0, m: 0, s: 0, d: 0, mAllure: 0, sAllure: 0 }
    liste.forEach((a) => {
      r.n += 1; r.m += a.distanceM; r.s += a.dureeS; r.d += a.denivelePos
      if (infoSport(a.sport)[2] === 'allure' && a.distanceM > 0) { r.mAllure += a.distanceM; r.sAllure += a.dureeS }
    })
    return r
  }, [liste])

  // Graphique des kilomètres : 12 dernières semaines (mode « Récentes »), sinon découpé selon la durée de la période
  const graphique = useMemo(() => {
    let from; let to
    if (mode === 'recent') { to = iso(new Date()); from = iso(addJours(lundiDe(new Date()), -77)) }
    else if (periode) ({ from, to } = periode)
    else return null
    const d = mode === 'recent' ? { gran: 'semaine', cles: Array.from({ length: 12 }, (_, i) => iso(addJours(lundiDe(new Date()), -77 + 7 * i))), cleDe: (j) => iso(lundiDe(parse(j))), libelle: jourMois } : decoupage(from, to)
    const parts = Object.fromEntries(d.cles.map((c) => [c, {}]))
    liste.forEach((a) => {
      const c = d.cleDe(a.debut.slice(0, 10))
      if (c in parts) { const f = famille(a.sport).id; parts[c][f] = (parts[c][f] || 0) + a.distanceM / 1000 }
    })
    const titre = mode === 'recent' ? 'Kilomètres par semaine (12 dernières semaines)' : `Kilomètres par ${d.gran}`
    const data = d.cles.map((c) => {
      const p = Object.fromEntries(Object.entries(parts[c]).map(([k, v]) => [k, Math.round(v * 10) / 10]))
      return { label: c, parts: p, total: Math.round(Object.values(p).reduce((x, y) => x + y, 0) * 10) / 10 }
    })
    return { titre, libelle: d.libelle, data }
  }, [mode, periode, liste])
  const famillesGraph = useMemo(() => presentes.filter((f) => !filtreActif || f.id === filtreActif), [presentes, filtreActif])

  return (
    <div className="strava">
      <div style={{ marginBottom: '1.4rem' }}>
        <span className="eyebrow">Visible de toi seul</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Mon activité</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Relie ton compte Strava pour retrouver ici tes sorties, tes kilomètres et ton dénivelé.
        </p>
      </div>

      {flash && (
        <p className={flash.ok ? 'roles-info' : 'roles-erreur'} role="status">
          {flash.msg} <button type="button" className="link-button" onClick={onFlashClear}>Fermer</button>
        </p>
      )}
      {erreur && <p className="roles-erreur">{erreur}</p>}
      {chargement && !statut && <p className="stats-vide">Chargement…</p>}

      {statut && !statut.configured && (
        <p className="roles-info">La liaison Strava n'est pas encore activée par le club. Elle sera disponible prochainement.</p>
      )}

      {statut && statut.configured && !statut.connected && (
        <section className="stats-bloc strava-accueil">
          <h3>Relier mon compte Strava</h3>
          <ul>
            <li><b>Tes activités ne sont visibles que de toi.</b> Ni les autres adhérents, ni le bureau n'y ont accès.</li>
            <li>Le club <b>ne conserve aucune activité</b> : elles sont lues chez Strava quand tu ouvres cet écran.</li>
            <li>Tu peux <b>déconnecter</b> ton compte à tout moment, ici ou depuis tes réglages Strava.</li>
          </ul>
          <p className="stats-note">Sur la page de Strava, laisse cochée l'autorisation « Voir les données de tes activités », sinon l'écran ne pourra rien afficher.</p>
          <button type="button" className="strava-btn" onClick={relier} disabled={occupe}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M15.4 17.9l-2.8-5.5-2.8 5.5H6.6l6-11.8 6 11.8zM9.8 13.5l1.7-3.3 1.1 2.3-1.2 2.3z" /></svg>
            {occupe ? 'Redirection…' : 'Se connecter avec Strava'}
          </button>
        </section>
      )}

      {statut && statut.connected && (
        <>
          <div className="strava-entete">
            <div>
              <b>{statut.athleteNom || 'Compte Strava relié'}</b>
              <small>Relié le {new Date(statut.connectedAt).toLocaleDateString('fr-FR')}</small>
            </div>
            <div className="strava-actions">
              <a className="btn btn--ghost" style={{ padding: '0.5rem 0.9rem', fontSize: '0.72rem', textDecoration: 'none' }} href={`https://www.strava.com/athletes/${statut.athleteId}`} target="_blank" rel="noopener noreferrer">Mon profil Strava ↗</a>
              <button type="button" className="btn btn--ghost" style={{ padding: '0.5rem 0.9rem', fontSize: '0.72rem' }} onClick={deconnecter} disabled={occupe}>Déconnecter</button>
            </div>
          </div>

          {!statut.activites && (
            <p className="roles-erreur">L'autorisation de lire tes activités n'a pas été accordée. Déconnecte ton compte puis reconnecte-le en laissant cochée « Voir les données de tes activités ».</p>
          )}

          {statut.activites && !stats && !chargement && (
            <p className="stats-note">Les totaux Strava (4 semaines, année, depuis toujours) ne sont pas disponibles pour le moment ; tes activités s'affichent ci-dessous.</p>
          )}
          {stats && (
            <div className="stats-grille">
              <Totaux titre="Course à pied" t={stats.course} />
              <Totaux titre="Vélo" t={stats.velo} />
              <Totaux titre="Natation" t={stats.natation} />
            </div>
          )}

          {statut.activites && (
            <>
              <div className="strava-periode">
                <span className="strava-periode__titre">Période</span>
                <Bascule label="Période affichée" options={MODES} value={mode} onChange={setMode} />
                {mode !== 'recent' && (
                  <div className="strava-periode__nav">
                    {mode === 'dates' ? (
                      <>
                        <ChampDate label="Du" valeur={debut} onChange={setDebut} max={fin || iso(new Date())} />
                        <ChampDate label="Au" valeur={fin} onChange={setFin} min={debut || undefined} max={iso(new Date())} />
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn btn--ghost" onClick={() => decaler(-1)} aria-label="Période précédente">‹</button>
                        <b>{libellePlage(mode, ref, periode)}</b>
                        <button type="button" className="btn btn--ghost" onClick={() => decaler(1)} disabled={!!periode && periode.to >= iso(new Date())} aria-label="Période suivante">›</button>
                        <button type="button" className="link-button" onClick={() => setRef(new Date())}>Aujourd'hui</button>
                      </>
                    )}
                  </div>
                )}
                <div className="strava-sports" role="group" aria-label="Sports affichés">
                  <button type="button" className={`strava-sport-puce${!filtreActif ? ' is-on' : ''}`} onClick={() => setFiltre('')}>Tous les sports</button>
                  {presentes.map((f) => (
                    <button key={f.id} type="button" className={`strava-sport-puce${filtreActif === f.id ? ' is-on' : ''}`} style={{ '--c': f.couleur }} onClick={() => setFiltre(filtreActif === f.id ? '' : f.id)} aria-pressed={filtreActif === f.id}>
                      <i aria-hidden="true" />{f.label}<small>{nf0.format(f.n)} · {km(f.m)}</small>
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'dates' && !periode && <p className="stats-vide">Choisis une date de début et une date de fin pour afficher la période.</p>}
              {chargePeriode && <p className="stats-vide">Chargement de la période…</p>}
              {tronque && mode !== 'recent' && <p className="roles-info">La période contient plus de 2 000 activités : seules les plus récentes sont affichées. Raccourcis-la pour tout voir.</p>}

              {(mode === 'recent' || periode) && !chargePeriode && (
                <>
                  <div className="stats-cartes">
                    <div className="stats-carte"><b>{nf0.format(resume.n)}</b><span>Sortie{resume.n > 1 ? 's' : ''}</span></div>
                    <div className="stats-carte"><b>{km(resume.m)}</b><span>Distance</span></div>
                    <div className="stats-carte"><b>{duree(resume.s)}</b><span>Temps en mouvement</span></div>
                    <div className="stats-carte"><b>{nf0.format(resume.d)} m</b><span>Dénivelé positif</span></div>
                    {resume.mAllure > 0 && <div className="stats-carte"><b>{allure(resume.mAllure / resume.sAllure)}</b><span>Allure moyenne</span><small>course et marche</small></div>}
                  </div>
                  {mode === 'recent' && <p className="stats-note" style={{ marginTop: '-0.6rem', marginBottom: '1rem' }}>Résumé des activités chargées ci-dessous. Choisis une période pour un bilan précis.</p>}
                  {graphique && <ColonnesEmpilees titre={graphique.titre} data={graphique.data} libelle={graphique.libelle} familles={famillesGraph} />}
                </>
              )}

              <section className="stats-bloc">
                <h3>Mes activités</h3>
                {liste.length === 0 ? <p className="stats-vide">{chargePeriode ? 'Chargement…' : 'Aucune activité sur cette période.'}</p> : (
                  <div className="stats-table-wrap">
                    <table className="stats-table">
                      <thead><tr><th>Date</th><th className="strava-trace"><span className="sr-only">Tracé</span></th><th>Activité</th><th className="num">Distance</th><th className="num">Durée</th><th className="num">Allure / vitesse</th><th className="num">D+</th><th className="num">FC moy.</th><th /></tr></thead>
                      <tbody>
                        {liste.map((a) => {
                          const [ico, lib, mode] = infoSport(a.sport)
                          const fam = famille(a.sport)
                          return (
                            <tr key={a.id} className="strava-ligne" style={{ '--c': fam.couleur }}>
                              <td>{dateFr(a.debut)}</td>
                              <td className="strava-trace">
                                {a.trace && (
                                  <button type="button" className="strava-trace__btn" onClick={() => setCarte(a)} title="Voir le tracé et les temps intermédiaires" aria-label={`Voir le tracé et les temps intermédiaires de « ${a.nom} »`}>
                                    <TraceMini trace={a.trace} couleur={fam.couleur} />
                                  </button>
                                )}
                              </td>
                              <td><span aria-hidden="true">{ico}</span> {a.nom}<small className="strava-sport-nom"> · {lib}{a.prive ? ' · privée' : ''}</small></td>
                              <td className="num">{a.distanceM ? km(a.distanceM) : '—'}</td>
                              <td className="num">{duree(a.dureeS)}</td>
                              <td className="num">{mode === 'allure' ? allure(a.vitesseMoy) : mode === 'vitesse' ? vitesse(a.vitesseMoy) : mode === 'nage' ? allure100(a.vitesseMoy) : '—'}</td>
                              <td className="num">{a.denivelePos ? `${nf0.format(a.denivelePos)} m` : '—'}</td>
                              <td className="num">{a.fcMoyenne ? nf0.format(a.fcMoyenne) : '—'}</td>
                              <td><a href={`https://www.strava.com/activities/${a.id}`} target="_blank" rel="noopener noreferrer" className="strava-lien">Voir sur Strava ↗</a></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {mode === 'recent' && suite && <button type="button" className="btn btn--ghost" style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', fontSize: '0.72rem' }} onClick={plus} disabled={occupe}>Charger les activités plus anciennes</button>}
              </section>
            </>
          )}
        </>
      )}

      {carte && (
        <Suspense fallback={null}>
          <CarteTrace
            activite={carte}
            couleur={famille(carte.sport).couleur}
            titre={`${infoSport(carte.sport)[0]} ${carte.nom}`}
            details={[dateFr(carte.debut), carte.distanceM ? km(carte.distanceM) : '', duree(carte.dureeS), carte.denivelePos ? `D+ ${nf0.format(carte.denivelePos)} m` : ''].filter(Boolean).join(' · ')}
            mode={infoSport(carte.sport)[2]}
            fmtVitesse={{ vitesse, nage: allure100 }[infoSport(carte.sport)[2]] || allure}
            charger={chargerDetail}
            onClose={fermerCarte}
          />
        </Suspense>
      )}

      <p className="strava-credit">Données fournies par <b>Strava</b>. Ce service n'est ni développé ni approuvé par Strava.</p>
    </div>
  )
}
