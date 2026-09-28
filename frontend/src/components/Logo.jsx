// Emblème générique de remplacement — à remplacer par le logo officiel du club
// (SVG ou PNG) dès qu'il est disponible, ex: <img src="/logo.svg" alt="SAM Paris 12" />
export default function Logo({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon
        points="50,3 93,26 93,74 50,97 7,74 7,26"
        fill="var(--color-club-red)"
      />
      <path
        d="M30 68 L46 46 L56 56 L72 32"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="72" cy="32" r="7" fill="#fff" />
    </svg>
  )
}
