export default function NotFound() {
  return (
    <main className="shell" style={{ padding: '6rem 0', textAlign: 'center' }}>
      <p className="eyebrow">Erreur</p>
      <h1 style={{ fontSize: '4rem', textTransform: 'uppercase', marginTop: '0.5rem' }}>Page introuvable</h1>
      <p style={{ marginTop: '1.5rem' }}>
        <a href="/" style={{ color: 'var(--vermilion)' }}>← Retour à l'accueil</a>
      </p>
    </main>
  )
}
