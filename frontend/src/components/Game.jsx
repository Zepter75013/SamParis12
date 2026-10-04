import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Borne, RunnerFigure, tirerCoureur } from './Legs.jsx'
import { api } from '../lib/api.js'
import { getToken } from '../lib/session.js'

// « SAM Run » : mini-jeu caché. Le coureur de la SAM saute par-dessus les haies et les cônes, se baisse sous les
// oiseaux, ramasse gels et gourdes ; chaque kilomètre franchi, une borne passe. À 5 km : félicitations du club.
// Espace / ↑ : sauter · ↓ : se baisser (ou plonger en l'air) · toucher : sauter, glisser vers le bas : se baisser.
const GRAVITY = 2600
const JUMP_V = 900
const RUNNER_X = 70
const GROUND = 46 // hauteur du sol depuis le bas du cadre
const PX_PER_KM = 3000 // 3 px = 1 m
const SPEED_START = 340
const SPEED_MAX = 760
const RUNNER_H = 66 // hauteur du corps (sans la flamme)
const DUCK_H = 36
const WIN_M = 5000
const BEST_KEY = 'sam-run-best'

// b = hauteur du bas de l'élément au-dessus du sol
const TYPES = {
  haie: { w: 34, h: 38, b: 0 },
  cone: { w: 22, h: 32, b: 0 },
  oiseau: { w: 38, h: 22, b: 40 },
  gel: { w: 16, h: 26, b: 70 },
  gourde: { w: 14, h: 30, b: 70 },
}

function Sprite({ type }) {
  switch (type) {
    case 'cone':
      return (
        <svg viewBox="0 0 22 32" width="22" height="32" aria-hidden="true">
          <path d="M11 1 L20 28 H2 Z" fill="#f08a24" />
          <path d="M8.4 9 H13.6 L14.8 13 H7.2 Z" fill="#fff" />
          <path d="M5.2 19 H16.8 L18 23 H4 Z" fill="#fff" />
          <rect x="0" y="28" width="22" height="4" rx="1" fill="#c96a10" />
        </svg>
      )
    case 'oiseau':
      return (
        <svg viewBox="0 0 38 22" width="38" height="22" aria-hidden="true" className="game-bird">
          <path d="M3 12 L9 9 L9 15 Z" fill="#f08a24" />
          <ellipse cx="21" cy="13" rx="11" ry="6.5" fill="#3b3631" />
          <circle cx="29.5" cy="9" r="4.4" fill="#3b3631" />
          <circle cx="30.6" cy="8.4" r="1" fill="#fff" />
          <path d="M33 9.5 L38 11 L33 12.4 Z" fill="#f08a24" />
          <path className="game-bird__wing" d="M16 11 Q20 -2 28 3 Q24 8 24 12 Z" fill="#6b625a" />
        </svg>
      )
    case 'gel':
      return (
        <svg viewBox="0 0 16 26" width="16" height="26" aria-hidden="true">
          <rect x="3" y="1" width="10" height="5" rx="1.5" fill="#3b3631" />
          <path d="M2 7 H14 L13 25 H3 Z" fill="#f4b400" stroke="#b07f00" strokeWidth="1" />
          <rect x="4.5" y="12" width="7" height="6" rx="1" fill="#fff" opacity="0.85" />
        </svg>
      )
    case 'gourde':
      return (
        <svg viewBox="0 0 14 30" width="14" height="30" aria-hidden="true">
          <rect x="4.5" y="0" width="5" height="5" rx="1" fill="#e10600" />
          <path d="M3 5 H11 Q13 8 13 11 V27 Q13 29.5 10.5 29.5 H3.5 Q1 29.5 1 27 V11 Q1 8 3 5 Z" fill="#7cc4f0" stroke="#3a86b8" strokeWidth="1" />
          <rect x="1.4" y="14" width="11.2" height="7" fill="#fff" opacity="0.8" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 34 38" width="34" height="38" aria-hidden="true">
          <path d="M5 38 V8 M29 38 V8" stroke="#3b3631" strokeWidth="3" fill="none" />
          <rect x="1.5" y="4" width="31" height="9" fill="#fff" stroke="#3b3631" strokeWidth="1.2" />
          <rect x="2.1" y="4.6" width="9" height="7.8" fill="#e10600" />
          <rect x="22.9" y="4.6" width="9" height="7.8" fill="#e10600" />
        </svg>
      )
  }
}

function lireRecord() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}
function ecrireRecord(v) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* stockage indisponible */ }
}
const fmt = (m) => `${m.toLocaleString('fr-FR')} m`

function Classement({ board }) {
  if (!board) return null
  return (
    <div className="game__board">
      <b>Classement des adhérents</b>
      {board.top.length === 0 ? (
        <span>Personne n'a encore couru : à toi de jouer !</span>
      ) : (
        <ol>
          {board.top.map((e) => (
            <li key={e.memberId} className={board.me && board.me.rang === e.rang ? 'is-me' : ''}>
              <i>{e.rang}</i>
              <span>{e.prenom} {e.nom}</span>
              <em>{fmt(e.meters)}</em>
            </li>
          ))}
        </ol>
      )}
      {board.me && board.me.rang > board.top.length && <span>Ton meilleur : {fmt(board.me.meters)} (n° {board.me.rang})</span>}
    </div>
  )
}

export default function Game({ onClose }) {
  const navigate = useNavigate()
  const [look] = useState(tirerCoureur)
  const [phase, setPhase] = useState('ready') // ready | play | win | over
  const [items, setItems] = useState([])
  const [result, setResult] = useState({ m: 0, best: lireRecord(), neuf: false })
  const [board, setBoard] = useState(null)
  const [connecte] = useState(() => Boolean(getToken()))
  const stage = useRef(null)
  const runnerEl = useRef(null)
  const hudEl = useRef(null)
  const flashEl = useRef(null)
  const nodes = useRef(new Map())
  const g = useRef({ phase: 'ready', y: 0, vy: 0, dist: 0, bonus: 0, time: 0, speed: SPEED_START, list: [], nextSpawn: 600, nextCollect: 1500, nextBorne: 1, idSeq: 0, overAt: 0, boostUntil: 0, duckKey: false, duckUntil: 0, won: false })

  // classement des adhérents (seulement si connecté)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.getGameLeaderboard(token).then(setBoard).catch(() => {})
  }, [])

  useEffect(() => {
    const dlg = stage.current
    const prevFocus = document.activeElement
    dlg.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const s = g.current
    let raf = 0
    let last = 0
    let width = dlg.clientWidth
    const onResize = () => { width = dlg.clientWidth }
    window.addEventListener('resize', onResize)

    const sync = () => setItems(s.list.map(({ id, type, n, b }) => ({ id, type, n, b })))
    const setP = (p) => { s.phase = p; setPhase(p) }
    const flash = (txt) => {
      const f = flashEl.current
      if (!f) return
      f.textContent = txt
      f.classList.remove('is-on')
      void f.offsetWidth
      f.classList.add('is-on')
    }

    const reset = () => {
      Object.assign(s, { y: 0, vy: 0, dist: 0, bonus: 0, time: 0, speed: SPEED_START, list: [], nextSpawn: 600, nextCollect: 1500, nextBorne: 1, boostUntil: 0, duckUntil: 0, won: false })
      sync()
      setP('play')
    }

    const jump = () => {
      if (s.phase === 'ready') { reset(); return }
      if (s.phase === 'over') { if (performance.now() - s.overAt > 400) reset(); return }
      if (s.phase === 'win') { setP('play'); return }
      if (s.y === 0) s.vy = JUMP_V
    }

    const finish = () => {
      s.overAt = performance.now()
      const m = Math.floor(s.dist / 3) + s.bonus
      const best = lireRecord()
      const neuf = m > best
      if (neuf) ecrireRecord(m)
      setResult({ m, best: Math.max(best, m), neuf })
      setP('over')
      const token = getToken()
      if (token && m > 0) api.postGameScore(token, m).then(setBoard).catch(() => {})
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - (last || now)) / 1000, 0.05)
      last = now
      const ducking = s.y === 0 && (s.duckKey || s.time < s.duckUntil)

      if (s.phase === 'play') {
        s.time += dt
        const boost = s.time < s.boostUntil ? 1.25 : 1
        s.speed = Math.min(SPEED_START + s.time * 9, SPEED_MAX) * boost
        s.dist += s.speed * dt

        // plongeon : se baisser en l'air fait retomber plus vite
        s.vy -= GRAVITY * dt * (s.y > 0 && s.duckKey ? 2.6 : 1)
        s.y += s.vy * dt
        if (s.y <= 0) { s.y = 0; s.vy = 0 }

        const meters = s.dist / 3
        // obstacles, avec un écart toujours franchissable ; les oiseaux n'arrivent qu'après 400 m
        if (s.dist >= s.nextSpawn) {
          const r = Math.random()
          const type = meters > 400 && r < 0.3 ? 'oiseau' : (r < 0.65 ? 'haie' : 'cone')
          s.list.push({ id: ++s.idSeq, type, x: width + 30, extra: type === 'oiseau' ? 70 : 0, ...TYPES[type] })
          s.nextSpawn = s.dist + s.speed * (0.85 + Math.random() * 0.8) + 170
          sync()
        }
        // gels et gourdes : en l'air, à ramasser en sautant
        if (s.dist >= s.nextCollect) {
          const type = Math.random() < 0.55 ? 'gourde' : 'gel'
          s.list.push({ id: ++s.idSeq, type, x: width + 30, collect: true, ...TYPES[type], b: Math.random() < 0.5 ? 70 : 105 })
          s.nextCollect = s.dist + 1300 + Math.random() * 1400
          sync()
        }
        // la borne du prochain kilomètre arrive pile quand on le franchit
        const bx = RUNNER_X + (s.nextBorne * PX_PER_KM - s.dist)
        if (bx < width + 60) {
          s.list.push({ id: ++s.idSeq, type: 'borne', n: s.nextBorne, x: bx, w: 40, h: 63, b: 0, borne: true })
          s.nextBorne += 1
          sync()
        }

        const left = RUNNER_X + 16
        const right = RUNNER_X + 44
        const top = s.y + (ducking ? DUCK_H : RUNNER_H)
        let hit = false
        let removed = false
        for (const o of s.list) {
          o.x -= s.speed * (o.type === 'oiseau' ? 1.18 : 1) * dt
          if (o.borne) {
            if (!o.passed && o.x <= RUNNER_X) { o.passed = true; flash(`Km ${o.n} !`) }
            continue
          }
          const overlapX = o.x + 5 < right && o.x + o.w - 5 > left
          if (!overlapX) continue
          if (o.collect) {
            if (s.y < o.b + o.h && top > o.b) {
              o.gone = true
              removed = true
              if (o.type === 'gel') { s.bonus += 50; s.boostUntil = s.time + 2.2; flash('Gel ! +50 m') } else { s.bonus += 25; flash('Gourde ! +25 m') }
            }
          } else if (s.y < o.b + o.h - 5 && top > o.b + 4) {
            hit = true
          }
        }
        const before = s.list.length
        s.list = s.list.filter((o) => o.x > -80 && !o.gone)
        if (removed || s.list.length !== before) sync()

        if (!s.won && meters >= WIN_M) { s.won = true; setP('win') }
        else if (hit) finish()
      }

      // rendu sans passer par React
      const r = runnerEl.current
      if (r) {
        r.style.transform = `translateY(${-s.y}px)${ducking ? ' scaleY(0.62)' : ''}`
        r.classList.toggle('is-running', s.phase === 'play' && s.y === 0)
        r.classList.toggle('is-boost', s.time < s.boostUntil && s.phase === 'play')
      }
      for (const o of s.list) {
        const el = nodes.current.get(o.id)
        if (el) el.style.transform = `translateX(${o.x}px)`
      }
      dlg.style.setProperty('--ground-x', `${-s.dist}px`)
      if (hudEl.current) hudEl.current.textContent = fmt(Math.floor(s.dist / 3) + s.bonus)
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); s.duckKey = true; return }
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'Enter') {
        // Entrée / Espace sur un bouton du panneau : on laisse le bouton agir
        if (e.target.closest && e.target.closest('.game__btn')) return
        e.preventDefault()
        if (!e.repeat) jump()
      }
    }
    const onKeyUp = (e) => { if (e.key === 'ArrowDown' || e.key === 's') s.duckKey = false }
    const onBlur = () => { s.duckKey = false }

    // toucher : appui court = saut, glissement vers le bas = se baisser
    let start = null
    const onDown = (e) => {
      if (e.target.closest('.game__close, .game__btn')) return
      start = { y: e.clientY, done: false }
      if (s.phase !== 'play') { jump(); start.done = true }
    }
    const onMove = (e) => {
      if (!start || start.done) return
      if (e.clientY - start.y > 24) { start.done = true; s.duckUntil = s.time + 0.7 }
    }
    const onUp = () => {
      if (start && !start.done) jump()
      start = null
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    dlg.addEventListener('pointerdown', onDown)
    dlg.addEventListener('pointermove', onMove)
    dlg.addEventListener('pointerup', onUp)
    dlg.addEventListener('pointercancel', onUp)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      dlg.removeEventListener('pointerdown', onDown)
      dlg.removeEventListener('pointermove', onMove)
      dlg.removeEventListener('pointerup', onUp)
      dlg.removeEventListener('pointercancel', onUp)
      document.body.style.overflow = prevOverflow
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
  }, [onClose])

  const rejoindre = () => {
    onClose()
    navigate('/adhesion')
  }
  const reprendre = () => {
    g.current.phase = 'play'
    setPhase('play')
    stage.current && stage.current.focus()
  }

  return (
    <div className="game" role="dialog" aria-modal="true" aria-label="SAM Run, mini-jeu">
      <div className="game__stage" ref={stage} tabIndex={-1}>
        <button type="button" className="game__close" onClick={onClose} aria-label="Fermer le jeu">✕</button>
        <div className="game__hud" aria-live="off">
          <span className="game__title">SAM Run</span>
          <span className="game__score" ref={hudEl}>0 m</span>
          <span className="game__best">Record {fmt(result.best)}</span>
        </div>
        <div className="game__flash" ref={flashEl} aria-hidden="true" />
        <div className="game__ground" aria-hidden="true" />

        {items.map((o) => (
          <div
            key={o.id}
            className={`game__item${o.type === 'borne' ? ' game__item--borne' : ''}`}
            style={{ bottom: GROUND + o.b }}
            ref={(el) => { if (el) nodes.current.set(o.id, el); else nodes.current.delete(o.id) }}
          >
            {o.type === 'borne' ? <Borne n={o.n} /> : <Sprite type={o.type} />}
          </div>
        ))}

        <div className="game__runner">
          <div
            className={`runner runner--game${look.femme ? ' is-woman' : ''}`}
            ref={runnerEl}
            style={{ '--skin': look.peau, '--hair': look.cheveux }}
          >
            <RunnerFigure look={look} />
          </div>
        </div>

        {phase === 'ready' && (
          <div className="game__panel">
            <b>SAM Run</b>
            <span>Saute les haies et cônes, baisse-toi sous les oiseaux, ramasse gels et gourdes, franchis les bornes.</span>
            <span className="game__hint">Espace / ↑ : sauter · ↓ : se baisser · mobile : toucher / glisser vers le bas</span>
            <Classement board={board} />
            {!connecte && <span className="game__hint">Connecte-toi à l'espace adhérent pour entrer au classement</span>}
          </div>
        )}
        {phase === 'win' && (
          <div className="game__panel game__panel--win">
            <b>Bravo, 5 km bouclés !</b>
            <span>Tu viens de courir un 5 km aux couleurs de la SAM Paris 12. Les entraînements t'attendent au stade Léo Lagrange.</span>
            <div className="game__actions">
              <button type="button" className="game__btn game__btn--solid" onClick={rejoindre}>Rejoindre le club</button>
              <button type="button" className="game__btn" onClick={reprendre}>Continuer à courir</button>
            </div>
          </div>
        )}
        {phase === 'over' && (
          <div className="game__panel">
            <b>{result.neuf ? 'Nouveau record !' : 'Arrêt sur obstacle'}</b>
            <span>{fmt(result.m)} parcourus · record {fmt(result.best)}</span>
            <Classement board={board} />
            {!connecte && <span className="game__hint">Connecte-toi à l'espace adhérent pour entrer au classement</span>}
            <span className="game__hint">Espace ou toucher pour repartir · Échap pour fermer</span>
          </div>
        )}
      </div>
    </div>
  )
}
