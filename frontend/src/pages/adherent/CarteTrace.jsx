import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decoderPolyline } from '../../lib/polyline.js'

// Carte d'une activité Strava : le tracé GPS sur un fond OpenStreetMap (départ, arrivée, bornes kilométriques) et les
// temps intermédiaires, par kilomètre et par tour. Le détail (tracé complet, temps intermédiaires) est lu chez Strava à
// l'ouverture : un appel par activité ouverte. Chargée à la demande ; visible de l'adhérent seul, comme le reste de l'écran.

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

const chrono = (s) => {
  if (!s && s !== 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(Math.round(s % 60)).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// Distance (m) entre deux points GPS
function ecart([la1, lo1], [la2, lo2]) {
  const r = Math.PI / 180
  const a = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(a))
}

// Découpe le tracé selon des distances cumulées (en m, ramenées à la longueur du tracé) : un tronçon par intermédiaire.
function troncons(points, distances) {
  if (points.length < 2 || distances.length === 0) return []
  const cumul = [0]
  for (let i = 1; i < points.length; i++) cumul.push(cumul[i - 1] + ecart(points[i - 1], points[i]))
  const total = distances.reduce((a, d) => a + d, 0) || 1
  const k = cumul[cumul.length - 1] / total
  const out = []
  let debut = 0
  let borne = 0
  for (const d of distances) {
    borne += d * k
    let fin = debut
    while (fin < points.length - 1 && cumul[fin] < borne) fin++
    out.push(points.slice(debut, fin + 1))
    debut = fin
  }
  return out
}

function Intermediaires({ lignes, tours, mode, fmtVitesse, survol, setSurvol }) {
  const vmax = Math.max(...lignes.map((l) => l.vitesseMoy || 0)) || 1
  const rapide = lignes.reduce((best, l, i) => (l.distanceM >= 500 && l.vitesseMoy > (lignes[best]?.vitesseMoy || 0) ? i : best), -1)
  return (
    <table className="inter-table">
      <thead>
        <tr>
          <th>{tours ? 'Tour' : 'Km'}</th>
          <th className="num">Temps</th>
          <th>{mode === 'vitesse' ? 'Vitesse' : 'Allure'}</th>
          <th className="num">{tours ? 'D+' : 'Dén.'}</th>
          <th className="num">FC</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((l, i) => {
          const partiel = !tours && l.distanceM < 950
          return (
            <tr
              key={i}
              className={`${i === survol ? 'is-survol' : ''}${i === rapide ? ' is-rapide' : ''}`}
              onMouseEnter={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(null)}
              onClick={() => setSurvol(i === survol ? null : i)}
            >
              <td>
                {tours ? (l.nom || `Tour ${i + 1}`) : partiel ? `${nf2.format(l.distanceM / 1000)} km` : i + 1}
                {tours && <small>{nf2.format(l.distanceM / 1000)} km</small>}
              </td>
              <td className="num">{chrono(l.dureeS)}</td>
              <td className="inter-allure">
                <span className="inter-barre" style={{ width: `${Math.max(8, ((l.vitesseMoy || 0) / vmax) * 100)}%` }} />
                <b>{fmtVitesse(l.vitesseMoy)}</b>
              </td>
              <td className="num">{l.denivele ? `${!tours && l.denivele > 0 ? '+' : ''}${nf.format(l.denivele)} m` : '—'}</td>
              <td className="num">{l.fcMoyenne ? Math.round(l.fcMoyenne) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function CarteTrace({ activite, couleur, titre, details, mode, fmtVitesse, charger, onClose }) {
  const boite = useRef(null)
  const fermer = useRef(null)
  const carteRef = useRef(null)
  const calques = useRef({})
  const [detail, setDetail] = useState(null)
  const [erreur, setErreur] = useState('')
  const [vue, setVue] = useState('kms')
  const [survol, setSurvol] = useState(null)

  // détail chez Strava : tracé complet et temps intermédiaires
  useEffect(() => {
    let annule = false
    charger()
      .then((d) => { if (!annule) setDetail(d) })
      .catch((e) => { if (!annule) setErreur(e.message || 'Temps intermédiaires indisponibles pour le moment.') })
    return () => { annule = true }
  }, [charger])

  const points = useMemo(() => decoderPolyline(detail?.trace || activite.trace), [detail, activite.trace])
  const lignes = useMemo(() => (detail ? (vue === 'tours' ? detail.tours : detail.kms) : []), [detail, vue])
  const parties = useMemo(() => troncons(points, lignes.map((l) => l.distanceM)), [points, lignes])

  // carte et fond OpenStreetMap
  useEffect(() => {
    const carte = L.map(boite.current, { scrollWheelZoom: true, zoomControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(carte)
    carteRef.current = carte
    return () => { carte.remove(); carteRef.current = null; calques.current = {} }
  }, [])

  // tracé, départ, arrivée ; recadrage seulement la première fois (le tracé complet remplace ensuite le simplifié)
  useEffect(() => {
    const carte = carteRef.current
    if (!carte || points.length < 2) return
    const c = calques.current
    c.trace?.remove(); c.depart?.remove(); c.arrivee?.remove()
    c.trace = L.polyline(points, { color: couleur, weight: 4, opacity: 0.85 }).addTo(carte)
    const plot = (p, fond, libelle) => L.circleMarker(p, { radius: 6, color: '#fff', weight: 2, fillColor: fond, fillOpacity: 1 }).bindTooltip(libelle).addTo(carte)
    // l'arrivée d'abord : sur une boucle, le départ reste visible par-dessus
    c.arrivee = plot(points[points.length - 1], '#1C1917', 'Arrivée')
    c.depart = plot(points[0], '#2F7D6D', 'Départ')
    if (!c.cadre) { carte.fitBounds(c.trace.getBounds(), { padding: [24, 24] }); c.cadre = true }
  }, [points, couleur])

  // bornes kilométriques (fin de chaque km complet)
  useEffect(() => {
    const carte = carteRef.current
    const c = calques.current
    c.bornes?.remove()
    if (!carte || !detail || vue !== 'kms') return
    const groupe = L.layerGroup()
    parties.forEach((t, i) => {
      if (i === parties.length - 1 || !t.length) return
      L.marker(t[t.length - 1], { icon: L.divIcon({ className: 'inter-borne', html: String(i + 1), iconSize: [20, 20] }), keyboard: false, interactive: false }).addTo(groupe)
    })
    c.bornes = groupe.addTo(carte)
  }, [parties, detail, vue])

  // tronçon survolé dans le tableau, mis en évidence sur la carte
  useEffect(() => {
    const carte = carteRef.current
    const c = calques.current
    c.survol?.remove()
    c.survol = null
    if (!carte || survol === null || !parties[survol] || parties[survol].length < 2) return
    c.survol = L.polyline(parties[survol], { color: '#1C1917', weight: 8, opacity: 0.85 }).addTo(carte)
    c.depart?.bringToFront()
  }, [survol, parties])

  useEffect(() => {
    const prec = document.activeElement
    fermer.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prec?.focus?.()
    }
  }, [onClose])

  const avecTours = detail && detail.tours.length > 1
  const choisir = (v) => { setVue(v); setSurvol(null) }

  return (
    <div className="trace-carte" role="dialog" aria-modal="true" aria-label={`Tracé et temps intermédiaires : ${activite.nom}`} onClick={onClose}>
      <div className="trace-carte__boite" onClick={(e) => e.stopPropagation()}>
        <div className="trace-carte__tete">
          <div>
            <b>{titre}</b>
            <small>{details}</small>
          </div>
          <button type="button" className="trace-carte__fermer" ref={fermer} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="trace-carte__corps">
          <div className="trace-carte__carte" ref={boite} />
          <div className="trace-carte__inter">
            <div className="inter-tete">
              <span className="inter-titre">Temps intermédiaires</span>
              {avecTours && (
                <div className="inter-onglets" role="tablist" aria-label="Découpage">
                  <button type="button" role="tab" aria-selected={vue === 'kms'} className={vue === 'kms' ? 'is-on' : ''} onClick={() => choisir('kms')}>Par km</button>
                  <button type="button" role="tab" aria-selected={vue === 'tours'} className={vue === 'tours' ? 'is-on' : ''} onClick={() => choisir('tours')}>Tours ({detail.tours.length})</button>
                </div>
              )}
            </div>
            {erreur ? <p className="stats-vide">{erreur}</p>
              : !detail ? <p className="stats-vide">Chargement des temps intermédiaires…</p>
                : lignes.length === 0 ? <p className="stats-vide">Strava ne fournit pas de temps intermédiaires pour cette activité.</p>
                  : <Intermediaires lignes={lignes} tours={vue === 'tours'} mode={mode} fmtVitesse={fmtVitesse} survol={survol} setSurvol={setSurvol} />}
            {detail && lignes.length > 0 && <p className="inter-note">Survole ou touche une ligne pour voir le tronçon sur la carte. En gras : {vue === 'tours' ? 'le tour' : 'le kilomètre'} le plus rapide.</p>}
          </div>
        </div>
        <div className="trace-carte__pied">
          <span><i style={{ background: '#2F7D6D' }} /> Départ <i style={{ background: '#1C1917' }} /> Arrivée</span>
          <a href={`https://www.strava.com/activities/${activite.id}`} target="_blank" rel="noopener noreferrer" className="strava-lien">Voir sur Strava ↗</a>
        </div>
      </div>
    </div>
  )
}
