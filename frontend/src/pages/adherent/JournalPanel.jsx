import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import Bascule from '../../components/Bascule.jsx'

// Journal d'activité : qui a fait quoi dans l'application, et si l'action a réussi (réservé aux rôles autorisés).

const fmtDate = (iso) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR')}`
}

const TYPES = [
  { value: '', label: 'Toutes' },
  { value: 'modification', label: 'Modifications' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'connexion', label: 'Connexions' },
]
const TYPE_AIDE = {
  '': 'Toutes les actions, quel que soit leur type.',
  modification: 'Actions qui modifient des données en base : création, modification ou suppression d\'une fiche, d\'un rôle, d\'une course, d\'un résultat, d\'un document, envoi d\'un message…',
  navigation: 'Actions qui ne modifient rien : ouverture d\'un écran, consultation d\'une liste ou d\'une fiche, statistiques, exports.',
  connexion: 'Connexions à l\'espace adhérent et demandes de code d\'accès.',
}
const LIBELLE_TYPE = { modification: 'Modification', navigation: 'Navigation', connexion: 'Connexion' }

function exporterCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lignes = [['Date et heure', 'Nom Prénom', 'Rôle', 'Type', 'Action', 'Détail', 'Résultat', 'Code', 'Adresse IP'].map(esc).join(';')]
  rows.forEach((r) => lignes.push([fmtDate(r.createdAt), r.nom, r.role, LIBELLE_TYPE[r.type] || r.type, r.action, r.detail, r.success ? 'OK' : 'Échec', r.status, r.ip].map(esc).join(';')))
  const blob = new Blob([`﻿${lignes.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export default function JournalPanel({ token }) {
  const [filtres, setFiltres] = useState({ q: '', role: '', type: '', ok: '', from: '', to: '' })
  const [qSaisie, setQSaisie] = useState('')
  const [rows, setRows] = useState([])
  const [more, setMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [auto, setAuto] = useState(false)
  const requete = useRef(0)

  const charger = useCallback(async (suite) => {
    const n = ++requete.current
    setErreur('')
    if (!suite) setLoading(true)
    try {
      const params = { limit: 50 }
      Object.entries(filtres).forEach(([k, v]) => { if (v) params[k] = v })
      if (suite && rows.length) params.before = rows[rows.length - 1].id
      const data = await api.getAudit(token, params)
      if (n !== requete.current) return // une requête plus récente a pris le relais
      setRows((cur) => (suite ? [...cur, ...data.rows] : data.rows))
      setMore(data.more)
      setTotal(data.total)
      setRoles(data.roles)
    } catch (e) {
      if (n === requete.current) setErreur(e.message)
    } finally {
      if (n === requete.current) setLoading(false)
    }
  }, [token, filtres, rows])

  // recharge à chaque changement de filtre
  useEffect(() => { charger(false) }, [filtres]) // eslint-disable-line react-hooks/exhaustive-deps

  // saisie du texte : on attend la fin de la frappe
  useEffect(() => {
    const t = setTimeout(() => setFiltres((f) => (f.q === qSaisie ? f : { ...f, q: qSaisie })), 400)
    return () => clearTimeout(t)
  }, [qSaisie])

  // actualisation automatique
  useEffect(() => {
    if (!auto) return undefined
    const t = setInterval(() => charger(false), 10000)
    return () => clearInterval(t)
  }, [auto, charger])

  const set = (k) => (e) => setFiltres((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="journal">
      <div style={{ marginBottom: '1.2rem' }}>
        <span className="eyebrow">Réservé aux rôles autorisés</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Journal d'activité</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Qui a fait quoi dans l'application : connexions, modifications de fiches, rôles, courses, résultats, documents, messagerie… et si l'action a réussi.
          Le type d'action permet de séparer les modifications de données, la navigation (ouverture d'écrans, consultations) et les connexions. Le contenu des messages n'est jamais enregistré. Les lignes sont conservées 12 mois.
        </p>
      </div>

      <div className="journal-filtres">
        <label className="journal-recherche">Recherche
          <input className="roles-input" type="search" value={qSaisie} onChange={(e) => setQSaisie(e.target.value)} placeholder="Nom, action ou détail…" />
        </label>
        <label>Rôle
          <select className="roles-select" value={filtres.role} onChange={set('role')}>
            <option value="">Tous les rôles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label>Résultat
          <select className="roles-select" value={filtres.ok} onChange={set('ok')}>
            <option value="">Tous</option>
            <option value="1">OK</option>
            <option value="0">Échecs</option>
          </select>
        </label>
        <label>Du<input className="roles-input" type="date" value={filtres.from} onChange={set('from')} /></label>
        <label>Au<input className="roles-input" type="date" value={filtres.to} onChange={set('to')} /></label>
      </div>

      <div className="journal-type">
        <span className="journal-type__titre">Type d'action</span>
        <Bascule label="Type d'action" options={TYPES} value={filtres.type} onChange={(v) => setFiltres((f) => ({ ...f, type: v }))} />
        <p className="bascule-aide">{TYPE_AIDE[filtres.type]}</p>
      </div>

      <div className="journal-barre">
        <span>{loading ? 'Chargement…' : `${total.toLocaleString('fr-FR')} ligne${total > 1 ? 's' : ''}`}{rows.length < total ? ` · ${rows.length} affichée${rows.length > 1 ? 's' : ''}` : ''}</span>
        <label className="journal-auto"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Actualiser toutes les 10 s</label>
        <button type="button" className="btn btn--ghost roles-btn" onClick={() => charger(false)}>Actualiser</button>
        <button type="button" className="btn btn--ghost roles-btn" onClick={() => exporterCsv(rows)} disabled={rows.length === 0}>Exporter en CSV</button>
      </div>

      {erreur && <p className="roles-erreur">{erreur}</p>}

      <div className="journal-table-wrap">
        <table className="journal-table">
          <thead>
            <tr><th>Date et heure</th><th>Nom Prénom</th><th>Rôle</th><th>Type</th><th>Action réalisée</th><th>Résultat</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.success ? '' : 'is-echec'} title={`Adresse IP : ${r.ip || 'inconnue'} · code ${r.status}`}>
                <td className="journal-date">{fmtDate(r.createdAt)}</td>
                <td><b>{r.nom || '—'}</b></td>
                <td>{r.role || '—'}</td>
                <td><span className={`journal-kind journal-kind--${r.type}`}>{LIBELLE_TYPE[r.type] || r.type}</span></td>
                <td>{r.action}{r.detail && <small>{r.detail}</small>}</td>
                <td><span className={`journal-res ${r.success ? 'is-ok' : 'is-ko'}`}>{r.success ? '✓ OK' : '✗ Échec'}</span></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="journal-vide">Aucune ligne pour ces filtres.</td></tr>}
          </tbody>
        </table>
      </div>

      {more && <button type="button" className="btn btn--ghost journal-plus" onClick={() => charger(true)}>Afficher les lignes plus anciennes</button>}
    </div>
  )
}
