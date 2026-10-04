import { useEffect, useRef, useState } from 'react'
import { Borne, RunnerFigure, tirerCoureur } from './Legs.jsx'

// « SAM Run » : mini-jeu caché. Le coureur de la SAM saute par-dessus les haies et les cônes ;
// chaque kilomètre franchi, une borne passe. Espace, flèche haut ou toucher pour sauter.
const GRAVITY = 2600
const JUMP_V = 900
const RUNNER_X = 70
const GROUND = 46 // hauteur du sol depuis le bas du cadre
const PX_PER_KM = 3000 // 3 px = 1 m
const SPEED_START = 340
const SPEED_MAX = 760
const BEST_KEY = 'sam-run-best'

const OBSTACLES = {
  haie: { w: 34, h: 38 },
  cone: { w: 22, h: 32 },
}

function Obstacle({ type }) {
  if (type === 'cone') {
    return (
      <svg viewBox="0 0 22 32" width="22" height="32" aria-hidden="true">
        <path d="M11 1 L20 28 H2 Z" fill="#f08a24" />
        <path d="M8.4 9 H13.6 L14.8 13 H7.2 Z" fill="#fff" />
        <path d="M5.2 19 H16.8 L18 23 H4 Z" fill="#fff" />
        <rect x="0" y="28" width="22" height="4" rx="1" fill="#c96a10" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 34 38" width="34" height="38" aria-hidden="true">
      <path d="M5 38 V8 M29 38 V8" stroke="#3b3631" strokeWidth="3" fill="none" />
      <rect x="1.5" y="4" width="31" height="9" fill="#fff" stroke="#3b3631" strokeWidth="1.2" />
      <rect x="2.1" y="4.6" width="9" height="7.8" fill="#e10600" />
      <rect x="22.9" y="4.6" width="9" height="7.8" fill="#e10600" />
    </svg>
  )
}

function lireRecord() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}
function ecrireRecord(v) {
  try { localStorage.setItem(BEST_KEY, String(v)) } catch { /* stockage indisponible */ }
}
const fmt = (m) => `${m.toLocaleString('fr-FR')} m`

export default function Game({ onClose }) {
  const [look] = useState(tirerCoureur)
  const [phase, setPhase] = useState('ready') // ready | play | over
  const [items, setItems] = useState([]) // obstacles et bornes à l'écran (positions mises à jour sans re-rendu)
  const [result, setResult] = useState({ m: 0, best: lireRecord(), neuf: false })
  const stage = useRef(null)
  const runnerEl = useRef(null)
  const hudEl = useRef(null)
  const flashEl = useRef(null)
  const nodes = useRef(new Map())
  const g = useRef({ phase: 'ready', y: 0, vy: 0, dist: 0, time: 0, speed: SPEED_START, list: [], nextSpawn: 600, nextBorne: 1, idSeq: 0, overAt: 0 })

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

    const sync = () => setItems(s.list.map(({ id, type, n }) => ({ id, type, n })))

    const reset = () => {
      s.phase = 'play'; s.y = 0; s.vy = 0; s.dist = 0; s.time = 0; s.speed = SPEED_START
      s.list = []; s.nextSpawn = 600; s.nextBorne = 1
      sync(); setPhase('play')
    }

    const jump = () => {
      if (s.phase === 'ready') { reset(); return }
      if (s.phase === 'over') { if (performance.now() - s.overAt > 400) reset(); return }
      if (s.y === 0) s.vy = JUMP_V
    }

    const finish = () => {
      s.phase = 'over'
      s.overAt = performance.now()
      const m = Math.floor(s.dist / 3)
      const best = lireRecord()
      const neuf = m > best
      if (neuf) ecrireRecord(m)
      setResult({ m, best: Math.max(best, m), neuf })
      setPhase('over')
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - (last || now)) / 1000, 0.05)
      last = now
      if (s.phase === 'play') {
        s.time += dt
        s.speed = Math.min(SPEED_START + s.time * 9, SPEED_MAX)
        s.dist += s.speed * dt

        s.vy -= GRAVITY * dt
        s.y += s.vy * dt
        if (s.y <= 0) { s.y = 0; s.vy = 0 }

        // apparition des obstacles, avec un écart toujours franchissable
        if (s.dist >= s.nextSpawn) {
          const type = Math.random() < 0.5 ? 'haie' : 'cone'
          s.list.push({ id: ++s.idSeq, type, x: width + 30, ...OBSTACLES[type] })
          s.nextSpawn = s.dist + s.speed * (0.85 + Math.random() * 0.8) + 170
          sync()
        }
        // la borne du prochain kilomètre arrive pile quand on le franchit
        const bx = RUNNER_X + (s.nextBorne * PX_PER_KM - s.dist)
        if (bx < width + 60) {
          s.list.push({ id: ++s.idSeq, type: 'borne', n: s.nextBorne, x: bx, w: 40, h: 63, borne: true })
          s.nextBorne += 1
          sync()
        }

        let changed = false
        const left = RUNNER_X + 16
        const right = RUNNER_X + 44
        let hit = false
        for (const o of s.list) {
          o.x -= s.speed * dt
          if (o.borne) {
            if (!o.passed && o.x <= RUNNER_X) {
              o.passed = true
              if (flashEl.current) {
                flashEl.current.textContent = `Km ${o.n} !`
                flashEl.current.classList.remove('is-on')
                void flashEl.current.offsetWidth
                flashEl.current.classList.add('is-on')
              }
            }
          } else if (o.x + 5 < right && o.x + o.w - 5 > left && s.y < o.h - 6) {
            hit = true
          }
        }
        const before = s.list.length
        s.list = s.list.filter((o) => o.x > -80)
        changed = s.list.length !== before
        if (changed) sync()
        if (hit) finish()
      }

      // rendu sans passer par React
      const r = runnerEl.current
      if (r) {
        r.style.transform = `translateY(${-s.y}px)`
        r.classList.toggle('is-running', s.phase === 'play' && s.y === 0)
      }
      for (const o of s.list) {
        const el = nodes.current.get(o.id)
        if (el) el.style.transform = `translateX(${o.x}px)`
      }
      dlg.style.setProperty('--ground-x', `${-s.dist}px`)
      if (hudEl.current) hudEl.current.textContent = fmt(Math.floor(s.dist / 3))
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'Enter') {
        e.preventDefault()
        if (!e.repeat) jump()
      }
    }
    const onPointer = (e) => {
      if (e.target.closest('.game__close')) return
      jump()
    }
    window.addEventListener('keydown', onKey)
    dlg.addEventListener('pointerdown', onPointer)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      dlg.removeEventListener('pointerdown', onPointer)
      document.body.style.overflow = prevOverflow
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }
  }, [onClose])

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
            ref={(el) => { if (el) nodes.current.set(o.id, el); else nodes.current.delete(o.id) }}
          >
            {o.type === 'borne' ? <Borne n={o.n} /> : <Obstacle type={o.type} />}
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
            <span>Saute par-dessus les haies et les cônes, franchis les bornes.</span>
            <span className="game__hint">Espace, ↑ ou toucher l'écran pour sauter</span>
          </div>
        )}
        {phase === 'over' && (
          <div className="game__panel">
            <b>{result.neuf ? 'Nouveau record !' : 'Arrêt sur obstacle'}</b>
            <span>{fmt(result.m)} parcourus · record {fmt(result.best)}</span>
            <span className="game__hint">Espace ou toucher pour repartir · Échap pour fermer</span>
          </div>
        )}
      </div>
    </div>
  )
}
