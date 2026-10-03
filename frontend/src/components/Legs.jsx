import { useEffect, useRef } from 'react'

// Borne kilométrique : calotte colorée « KM » et numéro de la rubrique.
export function Borne({ n }) {
  return (
    <svg className="borne" viewBox="0 0 64 88" role="img" aria-label={`Kilomètre ${n}`}>
      <path className="borne-body" d="M8 82 V32 Q8 6 32 6 Q56 6 56 32 V82 Z" />
      <path className="borne-cap" d="M8 32 Q8 6 32 6 Q56 6 56 32 Z" />
      <text className="borne-km" x="32" y="26">KM</text>
      <text className="borne-n" x="32" y="64">{String(n).padStart(2, '0')}</text>
      <line className="borne-ground" x1="2" y1="82" x2="62" y2="82" />
    </svg>
  )
}

// Petit coureur en maillot SAM (blanc à rayures rouges) qui court de borne en borne quand on fait défiler.
// Il suit la route : tout droit le long d'une borne, puis une courbe vers la suivante.
export function Runner() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const box = el && el.parentElement
    if (!box) return undefined
    let raf = 0
    let stopTimer = 0
    let faceLeft = false
    let last = null

    const place = () => {
      raf = 0
      const markers = [...box.querySelectorAll('.leg__marker')]
      const legs = [...box.querySelectorAll('.leg')]
      if (markers.length < 2 || el.offsetParent === null) return
      const c = box.getBoundingClientRect()
      const cx = markers.map((m) => { const r = m.getBoundingClientRect(); return r.left + r.width / 2 - c.left })
      const cy = markers.map((m) => { const r = m.getBoundingClientRect(); return r.top + r.height / 2 - c.top })
      // Repère de lecture : le milieu de l'écran, qui descend vers la dernière borne quand on arrive en bas de page,
      // pour que le coureur l'atteigne même si la page ne peut pas défiler davantage.
      const vh = window.innerHeight
      const maxScroll = document.documentElement.scrollHeight - vh
      let frac = 0.5
      if (maxScroll > 0) {
        const fEnd = Math.min(Math.max((c.top + window.scrollY + cy[cy.length - 1] - maxScroll) / vh, 0.5), 0.92)
        const w = Math.min(Math.max((window.scrollY - (maxScroll - vh)) / vh, 0), 1)
        frac = 0.5 + (fEnd - 0.5) * (w * w * (3 - 2 * w))
      }
      const y = Math.min(Math.max(vh * frac - c.top, cy[0]), cy[cy.length - 1])
      let i = 0
      while (i < cy.length - 2 && y > cy[i + 1]) i += 1
      const bottom = legs[i].getBoundingClientRect().bottom - c.top
      const t = Math.min(Math.max((y - (bottom - 40)) / 80, 0), 1)
      const x = cx[i] + (cx[i + 1] - cx[i]) * (t * t * (3 - 2 * t))
      if (last !== null && Math.abs(x - last) > 0.4) faceLeft = x < last
      last = x
      el.style.transform = `translate(${x - 20}px, ${y - 54}px)`
      el.classList.toggle('is-left', faceLeft)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(place)
      el.classList.add('is-running')
      clearTimeout(stopTimer)
      stopTimer = setTimeout(() => el.classList.remove('is-running'), 180)
    }
    const onResize = () => { if (!raf) raf = requestAnimationFrame(place) }

    place()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const late = setTimeout(place, 600) // une fois polices et photos en place
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      clearTimeout(stopTimer)
      clearTimeout(late)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="runner" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 40 56" width="40" height="56">
        <defs>
          <clipPath id="runner-torso"><path d="M14 14 L28 14 L27 33 L15 33 Z" /></clipPath>
        </defs>
        <ellipse className="runner-shadow" cx="20" cy="54" rx="11" ry="2" />
        <g className="runner-body">
          <g className="runner-arm runner-arm--b"><path d="M20 17 L13 26 L16 33" /><path className="runner-sleeve" d="M20 17 L16.8 21" /><path className="runner-cuff" d="M16.9 20.8 L16.1 21.8" /></g>
          <g className="runner-leg runner-leg--b"><path d="M20 35 L18 45 L21 53" /><path className="runner-shoe" d="M19 53 H25" /></g>
          <path className="runner-torso" d="M14 14 L28 14 L27 33 L15 33 Z" />
          <g clipPath="url(#runner-torso)">
            <path className="runner-stripe" d="M12 22 L30 21 L30 24.2 L12 25.2 Z" />
            <path className="runner-stripe" d="M12 26.6 L30 25.6 L30 28.8 L12 29.8 Z" />
            <path className="runner-stripe" d="M12 31.2 L30 30.2 L30 33.4 L12 34.4 Z" />
          </g>
          <path className="runner-collar" d="M17 14.2 Q22 18 27 14.2" />
          <path className="runner-shorts" d="M15 33 H27 L28 40.5 H14 Z" />
          <circle className="runner-skin" cx="22" cy="8" r="5.2" />
          <path className="runner-hair" d="M16.8 8.4 Q16.4 2.6 22 2.6 Q27.8 2.6 27.2 7.6 Q23 4.6 16.8 8.4 Z" />
          <g className="runner-leg runner-leg--a"><path d="M23 35 L27 45 L23 53" /><path className="runner-shoe" d="M22 53 H28" /></g>
          <g className="runner-arm runner-arm--a"><path d="M24 17 L31 25 L28 31" /><path className="runner-sleeve" d="M24 17 L27.4 21" /><path className="runner-cuff" d="M27.2 20.8 L28 21.8" /></g>
        </g>
      </svg>
    </div>
  )
}

// Met en avant (calotte rouge) la borne la plus proche du milieu de l'écran.
export function useActiveLegs() {
  useEffect(() => {
    const legs = document.querySelectorAll('.leg')
    if (!('IntersectionObserver' in window) || legs.length === 0) return undefined

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            legs.forEach((l) => l.classList.remove('is-active'))
            entry.target.classList.add('is-active')
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    legs.forEach((l) => obs.observe(l))
    return () => obs.disconnect()
  }, [])
}

// Parcours de bornes : une section par borne, numérotées dans l'ordre.
// sections : [{ id?, eyebrow?, title?, wide?, children }]
export function Legs({ sections }) {
  useActiveLegs()
  return (
    <div className="shell legs legs--page">
      <div className="course-line" aria-hidden="true" />
      <Runner />
      {sections.map((s, i) => (
        <section className="leg" id={s.id} key={s.id ?? s.title ?? i}>
          <div className="leg__marker"><Borne n={i + 1} /></div>
          <div className={`leg__body${s.wide ? ' leg__body--wide' : ''}`}>
            {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
            {s.title && <h2>{s.title}</h2>}
            {s.children}
          </div>
        </section>
      ))}
    </div>
  )
}

// Découpe des blocs de texte en sections, à chaque titre du niveau demandé.
// Les blocs qui précèdent le premier titre forment une section d'introduction,
// titrée par le titre de tête s'il y en a un ; une introduction réduite à un
// titre est ignorée.
export function sectionsFromBlocks(blocks, level) {
  const sections = []
  let cur = null
  const intro = []
  for (const b of blocks) {
    if (b.t === level) {
      cur = { title: b.text, blocks: [] }
      sections.push(cur)
    } else if (cur) {
      cur.blocks.push(b)
    } else {
      intro.push(b)
    }
  }
  if (intro.length > 0) {
    const [head, ...rest] = intro
    const titled = head.t === 'h2' || head.t === 'h3'
    const body = titled ? rest : intro
    if (body.length > 0) sections.unshift({ title: titled ? head.text : undefined, blocks: body })
  }
  return sections
}
