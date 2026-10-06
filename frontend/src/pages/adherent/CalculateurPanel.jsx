import { useMemo, useState } from 'react'

// Calculateur d'allure : à partir d'une distance et d'un chrono, la vitesse moyenne (km/h), l'allure (min/km) et le temps de
// passage sur une autre distance (par exemple un tour de piste). Tout se calcule dans le navigateur : rien n'est envoyé ni enregistré.

const DISTANCES = [
  { label: '5 km', m: 5000 },
  { label: '10 km', m: 10000 },
  { label: 'Semi-marathon', m: 21097 },
  { label: 'Marathon', m: 42195 },
]
const PASSAGES = [200, 400, 800, 1000, 5000]

// Nombre saisi (virgule ou point accepté) ; 0 si vide ou invalide
const nombre = (v) => {
  const n = Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

const fr = (n, d) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })

// 4 min 58,6 s au km → « 4:59 /km » (arrondi à la seconde)
function formaterAllure(secParKm) {
  const t = Math.round(secParKm)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} /km`
}

// Durée en secondes → « 1:36,0 » (moins d'une heure, au dixième) ou « 1:45:03 »
function formaterTemps(sec) {
  if (sec >= 3600) {
    const t = Math.round(sec)
    return `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }
  const dixiemes = Math.round(sec * 10)
  const s = dixiemes / 10
  if (s < 60) return `${fr(s, 1)} s`
  const m = Math.floor(s / 60)
  return `${m}:${fr(s - m * 60, 1).padStart(4, '0')}`
}

const EQUIVALENCES = [3, 4, 5, 6, 7, 8, 10].map((min) => ({ allure: `${min}:00 /km`, vitesse: 60 / min }))

export default function CalculateurPanel() {
  const [distance, setDistance] = useState('10000')
  const [h, setH] = useState('0')
  const [m, setM] = useState('40')
  const [s, setS] = useState('0')
  const [passage, setPassage] = useState('400')

  const { d, t, vitesse, allure, vitesseMs } = useMemo(() => {
    const d = nombre(distance)
    const t = nombre(h) * 3600 + nombre(m) * 60 + nombre(s)
    if (!d || !t) return { d, t, vitesse: 0, allure: 0, vitesseMs: 0 }
    return { d, t, vitesse: (d / t) * 3.6, allure: t / (d / 1000), vitesseMs: d / t }
  }, [distance, h, m, s])

  const p = nombre(passage)
  const calcule = vitesse > 0
  const tempsPassage = calcule && p ? (t * p) / d : 0

  return (
    <div className="calc">
      <div style={{ marginBottom: '1.4rem' }}>
        <span className="eyebrow">Outil</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Calculateur d'allure</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Entre la distance d'une course et ton chrono (réalisé ou visé) : tu obtiens ta vitesse moyenne et ton allure au kilomètre, puis ton temps de passage sur la distance de ton choix.
        </p>
      </div>

      <div className="calc-grille">
        <section className="stats-bloc calc-saisie">
          <h3>Distance et chrono</h3>

          <span className="calc-titre">Distances populaires</span>
          <div className="calc-raccourcis">
            {DISTANCES.map((x) => (
              <button key={x.m} type="button" className={`calc-puce${nombre(distance) === x.m ? ' is-on' : ''}`} onClick={() => setDistance(String(x.m))}>{x.label}</button>
            ))}
          </div>

          <label className="calc-champ">
            <span className="calc-titre">Distance de la course</span>
            <span className="calc-unite"><input className="roles-input" type="text" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} aria-describedby="calc-dist-aide" /> mètres</span>
            <small id="calc-dist-aide">{d ? `soit ${fr(d / 1000, 3)} km` : 'Saisis la distance en mètres.'}</small>
          </label>

          <fieldset className="calc-champ calc-chrono">
            <legend className="calc-titre">Chrono réalisé ou visé</legend>
            <label><input className="roles-input" type="text" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} aria-label="Heures" /> h</label>
            <label><input className="roles-input" type="text" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} aria-label="Minutes" /> min</label>
            <label><input className="roles-input" type="text" inputMode="decimal" value={s} onChange={(e) => setS(e.target.value)} aria-label="Secondes" /> sec</label>
          </fieldset>
        </section>

        <section className="stats-bloc calc-resultat" aria-live="polite">
          <h3>Résultat</h3>
          <div className="calc-chiffres">
            <div>
              <span className="calc-titre">Vitesse moyenne</span>
              <b>{calcule ? fr(vitesse, 2) : '—'}<small> km/h</small></b>
              {calcule && <em>{fr(vitesseMs, 2)} m/s</em>}
            </div>
            <div>
              <span className="calc-titre">Allure</span>
              <b>{calcule ? formaterAllure(allure) : '—'}</b>
              {calcule && <em>soit {fr(allure / 60, 2)} min par km</em>}
            </div>
          </div>

          <div className="calc-passage">
            <span className="calc-titre">Temps de passage à cette vitesse</span>
            <div className="calc-raccourcis">
              {PASSAGES.map((x) => (
                <button key={x} type="button" className={`calc-puce${p === x ? ' is-on' : ''}`} onClick={() => setPassage(String(x))}>{x >= 1000 ? `${x / 1000} km` : `${x} m`}</button>
              ))}
            </div>
            <label className="calc-unite">
              <input className="roles-input" type="text" inputMode="decimal" value={passage} onChange={(e) => setPassage(e.target.value)} aria-label="Distance du temps de passage, en mètres" /> mètres
            </label>
            <b className="calc-temps">{tempsPassage ? formaterTemps(tempsPassage) : '—'}</b>
          </div>
        </section>
      </div>

      <section className="stats-bloc">
        <h3>Comment on calcule</h3>
        <ul className="calc-formules">
          <li><b>Vitesse</b> = distance ÷ temps. En km/h : la distance en kilomètres divisée par le temps en heures. En m/s : la distance en mètres divisée par le temps en secondes.</li>
          <li><b>De m/s à km/h</b> : multiplier par 3,6 (1 km = 1 000 m et 1 h = 3 600 s).</li>
          <li><b>Allure</b> = temps ÷ distance en kilomètres : le temps qu'il faut pour courir 1 km. Une allure de 4:00 /km veut dire 4 minutes par kilomètre, soit 15 km/h (15 fois 4 minutes dans une heure).</li>
          <li><b>Exemple</b> : 10 km en 40 min → 10 000 m ÷ 2 400 s × 3,6 = 15 km/h, soit 4:00 /km.</li>
          <li><b>Temps de passage</b> : le chrono multiplié par (distance cherchée ÷ distance de la course). À 4:00 /km, un tour de piste de 400 m se court en 1:36.</li>
        </ul>
        <div className="stats-table-wrap" style={{ maxHeight: 'none' }}>
          <table className="stats-table calc-equiv">
            <caption>Quelques équivalences</caption>
            <thead><tr><th>Allure</th><th className="num">Vitesse</th></tr></thead>
            <tbody>{EQUIVALENCES.map((e) => <tr key={e.allure}><td>{e.allure}</td><td className="num">{fr(e.vitesse, e.vitesse % 1 ? 1 : 0)} km/h</td></tr>)}</tbody>
          </table>
        </div>
        <p className="stats-note">Distances officielles : un semi-marathon mesure 21 097 m (21,0975 km) et un marathon 42 195 m. Saisis ces valeurs plutôt qu'une distance arrondie : quelques dizaines de mètres de différence modifient déjà l'allure calculée.</p>
      </section>
    </div>
  )
}
