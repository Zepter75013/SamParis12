import { useMemo } from 'react'
import { decoderPolyline } from '../lib/polyline.js'

// Miniature d'un tracé GPS (sans fond de carte) : projection simple, corrigée de la latitude, centrée dans le cadre.
export function cheminTrace(points, w, h, marge = 3) {
  if (points.length < 2) return ''
  const k = Math.cos((points[0][0] * Math.PI) / 180)
  const xs = points.map((p) => p[1] * k)
  const ys = points.map((p) => -p[0])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const ech = Math.min((w - 2 * marge) / (x1 - x0 || 1e-9), (h - 2 * marge) / (y1 - y0 || 1e-9))
  const dx = (w - (x1 - x0) * ech) / 2
  const dy = (h - (y1 - y0) * ech) / 2
  return xs.map((x, i) => `${i ? 'L' : 'M'}${(dx + (x - x0) * ech).toFixed(1)} ${(dy + (ys[i] - y0) * ech).toFixed(1)}`).join('')
}

export default function TraceMini({ trace, couleur, w = 56, h = 40 }) {
  const d = useMemo(() => cheminTrace(decoderPolyline(trace), w, h), [trace, w, h])
  if (!d) return null
  return (
    <svg className="trace-mini" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke={couleur} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
