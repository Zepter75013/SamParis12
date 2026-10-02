// Rend des blocs de texte structurés ({ t: 'h2' | 'h3' | 'p' | 'ul', ... }) issus de
// data/siteContent.js — jamais de HTML brut, tout passe par React.
export default function ContentBlocks({ blocks }) {
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        if (b.t === 'h2') return <h2 key={i}>{b.text}</h2>
        if (b.t === 'h3') return <h3 key={i}>{b.text}</h3>
        if (b.t === 'ul') {
          return (
            <ul key={i}>
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          )
        }
        return (
          <p key={i}>
            {b.lines.map((l, j) => (
              <span key={j}>{j > 0 && <br />}{l}</span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
