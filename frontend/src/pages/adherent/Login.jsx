import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    navigate('/espace-adherent/tableau-de-bord')
  }

  return (
    <div className="login-container">
      <div className="shell" style={{ paddingTop: '1rem' }}>
        <button onClick={() => navigate('/')} className="link-button">
          ← Retour au site public
        </button>
      </div>

      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Logo officiel SAM Paris 12" style={{ width: 64, height: 58, objectFit: 'contain', margin: '0 auto 1rem', display: 'block' }} />
          <h1 style={{ fontSize: '2.2rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>Espace Adhérent</h1>
          <p className="eyebrow" style={{ marginTop: '0.4rem' }}>SAM Paris 12 · Portail des membres</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                Identifiant ou Email club
              </label>
              <input type="text" className="login-input" defaultValue="adherent.demo" required />
            </div>

            <div>
              <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                Mot de passe
              </label>
              <input type="password" className="login-input" defaultValue="demo1234" required />
            </div>

            <div style={{ paddingTop: '0.5rem' }}>
              <button type="submit" className="btn btn--solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.75rem' }}>
                Se connecter
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.8rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)', margin: '0 0 0.8rem' }}>
              Pour tester l'interface sans saisir d'identifiants :
            </p>
            <button onClick={() => navigate('/espace-adherent/tableau-de-bord')} className="btn btn--ghost" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.72rem' }}>
              Explorer la démo de l'espace adhérent →
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)' }}>
          Besoin d'aide pour vous connecter ? <a href="mailto:contact@samparis12.org" style={{ color: 'var(--vermilion)', textDecoration: 'underline' }}>contact@samparis12.org</a>
        </div>
      </div>

      <footer style={{ textAlign: 'center', paddingBlock: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--stone)', textTransform: 'uppercase' }}>
        SAM Paris 12 — Système d'information adhérent · 2026-2027
      </footer>
    </div>
  )
}
