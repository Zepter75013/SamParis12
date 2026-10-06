import { useEffect, useId, useRef, useState } from 'react'

// Champ date : saisie directe au format JJ/MM/AAAA (les « / » s'ajoutent tout seuls) ou choix dans un calendrier qui
// s'ouvre avec le bouton à droite. Les valeurs échangées sont des dates ISO « AAAA-MM-JJ » (chaîne vide : aucune date).

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

const deux = (n) => String(n).padStart(2, '0')
const iso = (a, m, j) => `${a}-${deux(m + 1)}-${deux(j)}`
const aujourdhui = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()) }
const affiche = (v) => (v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : '')

// « 05032026 » → « 05/03/2026 » au fil de la frappe
function formater(saisie) {
  const c = saisie.replace(/\D/g, '').slice(0, 8)
  if (c.length <= 2) return c
  if (c.length <= 4) return `${c.slice(0, 2)}/${c.slice(2)}`
  return `${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4)}`
}

// « 05/03/2026 » → « 2026-03-05 » si la date existe, sinon null
function lire(texte) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texte)
  if (!m) return null
  const j = Number(m[1]); const mo = Number(m[2]) - 1; const a = Number(m[3])
  const d = new Date(a, mo, j, 12)
  return d.getFullYear() === a && d.getMonth() === mo && d.getDate() === j ? iso(a, mo, j) : null
}

export default function ChampDate({ label, valeur, onChange, min, max }) {
  const id = useId()
  const racine = useRef(null)
  const [texte, setTexte] = useState(affiche(valeur))
  const [ouvert, setOuvert] = useState(false)
  const [erreur, setErreur] = useState('')
  const base = valeur || (max && max < aujourdhui() ? max : aujourdhui())
  const [vue, setVue] = useState({ a: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 })

  // la valeur change de l'extérieur (calendrier, bouton « Effacer », autre champ) : le texte suit
  useEffect(() => { setTexte(affiche(valeur)); setErreur('') }, [valeur])

  // fermeture du calendrier : clic à l'extérieur ou touche Échap
  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => { if (racine.current && !racine.current.contains(e.target)) setOuvert(false) }
    const touche = (e) => { if (e.key === 'Escape') setOuvert(false) }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', touche)
    return () => { document.removeEventListener('mousedown', dehors); document.removeEventListener('keydown', touche) }
  }, [ouvert])

  const horsLimites = (v) => (min && v < min) || (max && v > max)

  function saisir(e) {
    const t = formater(e.target.value)
    setTexte(t)
    setErreur('')
    if (t === '') { onChange(''); return }
    if (t.length === 10) {
      const v = lire(t)
      if (!v) setErreur('Cette date n\'existe pas.')
      else if (horsLimites(v)) setErreur(max && v > max ? `Pas après le ${affiche(max)}.` : `Pas avant le ${affiche(min)}.`)
      else onChange(v)
    }
  }

  function ouvrir() {
    if (!ouvert) {
      const b = valeur || base
      setVue({ a: Number(b.slice(0, 4)), m: Number(b.slice(5, 7)) - 1 })
    }
    setOuvert((o) => !o)
  }

  function choisir(v) {
    onChange(v)
    setOuvert(false)
  }

  function decaler(n) {
    setVue((x) => { const d = new Date(x.a, x.m + n, 1, 12); return { a: d.getFullYear(), m: d.getMonth() } })
  }

  // cases du mois affiché : décalage jusqu'au lundi, puis les jours
  const premier = (new Date(vue.a, vue.m, 1, 12).getDay() + 6) % 7
  const nbJours = new Date(vue.a, vue.m + 1, 0, 12).getDate()
  const cases = [...Array(premier).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)]
  const anneeMin = min ? Number(min.slice(0, 4)) : new Date().getFullYear() - 30
  const anneeMax = max ? Number(max.slice(0, 4)) : new Date().getFullYear() + 1
  const annees = Array.from({ length: anneeMax - anneeMin + 1 }, (_, i) => anneeMax - i)

  return (
    <div className="champ-date" ref={racine}>
      <label htmlFor={id} className="champ-date__label">{label}</label>
      <div className="champ-date__groupe">
        <input id={id} className="roles-input champ-date__saisie" type="text" inputMode="numeric" autoComplete="off" placeholder="JJ/MM/AAAA" maxLength={10}
          value={texte} onChange={saisir} aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-err` : undefined} />
        <button type="button" className="champ-date__bouton" onClick={ouvrir} aria-label={`Ouvrir le calendrier : ${label}`} aria-expanded={ouvert}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 8h14v9H5v-9zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z" /></svg>
        </button>
      </div>
      {erreur && <small id={`${id}-err`} className="champ-date__erreur">{erreur}</small>}

      {ouvert && (
        <div className="champ-date__pop" role="dialog" aria-label={`Calendrier : ${label}`}>
          <div className="champ-date__tete">
            <button type="button" onClick={() => decaler(-1)} aria-label="Mois précédent">‹</button>
            <select value={vue.m} onChange={(e) => setVue((x) => ({ ...x, m: Number(e.target.value) }))} aria-label="Mois">
              {MOIS.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
            <select value={vue.a} onChange={(e) => setVue((x) => ({ ...x, a: Number(e.target.value) }))} aria-label="Année">
              {annees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="button" onClick={() => decaler(1)} aria-label="Mois suivant">›</button>
          </div>
          <div className="champ-date__grille">
            {JOURS.map((j) => <span key={j} className="champ-date__jour">{j}</span>)}
            {cases.map((n, i) => {
              if (n === null) return <span key={`v${i}`} />
              const v = iso(vue.a, vue.m, n)
              const desactive = horsLimites(v)
              return (
                <button key={v} type="button" disabled={desactive} onClick={() => choisir(v)}
                  className={`champ-date__case${v === valeur ? ' is-on' : ''}${v === aujourdhui() ? ' is-aujourdhui' : ''}`} aria-pressed={v === valeur}>
                  {n}
                </button>
              )
            })}
          </div>
          <div className="champ-date__pied">
            <button type="button" onClick={() => { const t = aujourdhui(); if (!horsLimites(t)) choisir(t) }} disabled={horsLimites(aujourdhui())}>Aujourd'hui</button>
            <button type="button" onClick={() => choisir('')}>Effacer</button>
          </div>
        </div>
      )}
    </div>
  )
}
