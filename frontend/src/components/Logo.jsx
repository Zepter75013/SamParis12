// Emblème générique de remplacement — à remplacer par le logo officiel du club
// dès qu'il est disponible (SVG ou PNG).
export default function Logo({ className }) {
  return (
    <svg viewBox="0 0 60 68" className={className} aria-hidden="true">
      <path d="M30 2 56 17 56 51 30 66 4 51 4 17Z" fill="none" stroke="var(--vermilion)" strokeWidth="4" />
      <path d="M17 40 27 27 33 34 43 20" fill="none" stroke="var(--vermilion)" strokeWidth="4" strokeLinecap="square" />
      <circle cx="44" cy="15" r="4" fill="var(--vermilion)" />
    </svg>
  )
}
