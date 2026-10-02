import { useEffect, useRef, useState } from 'react'

// Photos du club (reprises de la page d'accueil du site actuel), dans /public/photos.
export const PHOTOS = Array.from({ length: 18 }, (_, i) => `/photos/sam-${String(i + 1).padStart(2, '0')}.jpg`)

// Diaporama en fondu enchaîné, photo toujours entière (jamais recadrée). Une seule photo est chargée à la fois,
// plus la suivante en avance ; aucun défilement si l'utilisateur préfère moins d'animations.
export function HeroSlides() {
  const [cur, setCur] = useState(0)
  const prev = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const t = setInterval(() => {
      setCur((c) => {
        prev.current = c
        return (c + 1) % PHOTOS.length
      })
    }, 5500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const img = new Image()
    img.src = PHOTOS[(cur + 1) % PHOTOS.length]
  }, [cur])

  return (
    <div className="hero-slides" aria-hidden="true">
      {prev.current !== null && <img key={`p${prev.current}`} className="hero-slide" src={PHOTOS[prev.current]} alt="" />}
      <img key={cur} className="hero-slide hero-slide--in" src={PHOTOS[cur]} alt="" fetchpriority={cur === 0 ? 'high' : undefined} />
    </div>
  )
}

// Photo de bandeau stable pour une page donnée (même page = même photo).
export function bannerPhoto(key) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return PHOTOS[h % PHOTOS.length]
}
