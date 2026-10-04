import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

const Game = lazy(() => import('./Game.jsx'))

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

// Œuf de Pâques : le mini-jeu « SAM Run » se lance en cliquant sur le petit coureur, avec le code Konami,
// ou en cliquant 5 fois de suite sur le logo (événement « sam-game »).
export default function EasterEgg() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    let pos = 0
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      pos = k === KONAMI[pos] ? pos + 1 : (k === KONAMI[0] ? 1 : 0)
      if (pos === KONAMI.length) { pos = 0; setOpen(true) }
    }
    const onGame = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('sam-game', onGame)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('sam-game', onGame)
    }
  }, [])

  if (!open) return null
  return <Suspense fallback={null}><Game onClose={close} /></Suspense>
}
