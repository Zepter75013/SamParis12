import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { Colonnes } from './StatsPanel.jsx'

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

const FILTRES = [
  { id: '', label: 'Toutes' },
  { id: 'course', label: 'Course et marche', sports: ['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike'] },
  { id: 'velo', label: 'Vélo', sports: ['Ride', 'GravelRide', 'MountainBikeRide', 'EBikeRide', 'VirtualRide'] },
]

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

// Lundi de la semaine d'une date (AAAA-MM-JJ)
function lundi(iso) {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

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
  const [statut, setStatut] = useState(null)
  const [stats, setStats] = useState(null)
  const [activites, setActivites] = useState([])
  const [suite, setSuite] = useState(false)
  const [page, setPage] = useState(1)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)
  const [occupe, setOccupe] = useState(false)
  const [filtre, setFiltre] = useState('')

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

  const sportsFiltre = FILTRES.find((f) => f.id === filtre)?.sports
  const liste = useMemo(() => (sportsFiltre ? activites.filter((a) => sportsFiltre.includes(a.sport)) : activites), [activites, sportsFiltre])

  // Kilomètres par semaine sur les 12 dernières semaines
  const semaines = useMemo(() => {
    const debut = new Date(lundi(new Date().toISOString()) + 'T12:00:00')
    const cles = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(debut)
      d.setDate(d.getDate() - 7 * (11 - i))
      return d.toISOString().slice(0, 10)
    })
    const somme = Object.fromEntries(cles.map((c) => [c, 0]))
    liste.forEach((a) => { const w = lundi(a.debut); if (w in somme) somme[w] += a.distanceM / 1000 })
    return cles.map((c) => ({ label: c, n: Math.round(somme[c] * 10) / 10 }))
  }, [liste])

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
              <div className="stats-filtre">
                <label>Activités affichées
                  <select className="roles-select" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
                    {FILTRES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </label>
              </div>
              <Colonnes titre="Kilomètres par semaine (12 dernières semaines)" data={semaines} libelle={(l) => `${l.slice(8, 10)}/${l.slice(5, 7)}`} note="Semaines du lundi au dimanche, d'après les activités chargées ci-dessous." />

              <section className="stats-bloc">
                <h3>Mes activités</h3>
                {liste.length === 0 ? <p className="stats-vide">Aucune activité à afficher.</p> : (
                  <div className="stats-table-wrap">
                    <table className="stats-table">
                      <thead><tr><th>Date</th><th>Activité</th><th className="num">Distance</th><th className="num">Durée</th><th className="num">Allure / vitesse</th><th className="num">D+</th><th className="num">FC moy.</th><th /></tr></thead>
                      <tbody>
                        {liste.map((a) => {
                          const [ico, lib, mode] = infoSport(a.sport)
                          return (
                            <tr key={a.id}>
                              <td>{dateFr(a.debut)}</td>
                              <td><span aria-hidden="true">{ico}</span> {a.nom}<small> · {lib}{a.prive ? ' · privée' : ''}</small></td>
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
                {suite && <button type="button" className="btn btn--ghost" style={{ marginTop: '0.8rem', padding: '0.5rem 1rem', fontSize: '0.72rem' }} onClick={plus} disabled={occupe}>Charger les activités plus anciennes</button>}
              </section>
            </>
          )}
        </>
      )}

      <p className="strava-credit">Données fournies par <b>Strava</b>. Ce service n'est ni développé ni approuvé par Strava.</p>
    </div>
  )
}
