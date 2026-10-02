import { useEffect } from 'react'

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
