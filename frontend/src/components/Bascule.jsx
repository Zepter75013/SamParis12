// Bascule (interrupteur coulissant) à 2 ou 3 choix : une pastille à dégradé glisse sous le choix actif.
// Accessible : groupe de boutons radio, utilisable au clavier (Tab, Entrée/Espace, flèches gauche/droite).
export default function Bascule({ options, value, onChange, label }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  const onKeyDown = (e) => {
    const pas = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!pas) return
    e.preventDefault()
    const suivant = options[(index + pas + options.length) % options.length]
    onChange(suivant.value)
    e.currentTarget.parentElement.querySelectorAll('button')[options.indexOf(suivant)]?.focus()
  }

  return (
    <div className="bascule" role="radiogroup" aria-label={label} style={{ '--n': options.length, '--i': index }}>
      <span className="bascule__pastille" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={onKeyDown}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
