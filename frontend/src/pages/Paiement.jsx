import { Link } from 'react-router-dom'

export default function Paiement() {
  return (
    <div className="login-container">
      <div className="shell" style={{ paddingTop: '1rem' }}>
        <Link to="/" className="link-button">
          ← Retour au site
        </Link>
      </div>

      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Logo officiel SAM Paris 12" style={{ width: 64, height: 58, objectFit: 'contain', margin: '0 auto 1rem', display: 'block' }} />
          <h1 style={{ fontSize: '2.2rem', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>Paiement sécurisé</h1>
          <p className="eyebrow" style={{ marginTop: '0.4rem' }}>SAM Paris 12 · Cotisation &amp; règlements</p>
        </div>

        <div className="login-card">
          <form
            method="post"
            action="https://samparis12.org/public/paiement/index.php"
            style={{ display: 'grid', gap: '1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
          >
            <div>
              <label htmlFor="customer_name" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                Votre nom <span style={{ color: 'var(--vermilion)' }}>*</span>
              </label>
              <input type="text" id="customer_name" name="customer_name" className="login-input" placeholder="Prénom NOM" required />
            </div>

            <div>
              <label htmlFor="order_description" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                Objet du paiement <span style={{ color: 'var(--vermilion)' }}>*</span>
              </label>
              <input type="text" id="order_description" name="order_description" className="login-input" placeholder="Ex : Adhésion 2026-2027, Facture n°…" required />
            </div>

            <div>
              <label htmlFor="amount" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                Montant <span style={{ color: 'var(--vermilion)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input type="text" id="amount" name="amount" className="login-input" placeholder="0,00" required style={{ paddingRight: '2.2rem' }} />
                <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--stone)' }}>€</span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--stone)', marginTop: '0.35rem' }}>Utilisez une virgule ou un point comme séparateur décimal.</p>
            </div>

            <div>
              <label htmlFor="customer_email" style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                Adresse email <span style={{ color: 'var(--stone)', textTransform: 'none' }}>(facultatif)</span>
              </label>
              <input type="email" id="customer_email" name="customer_email" className="login-input" placeholder="vous@exemple.fr" />
              <p style={{ fontSize: '0.68rem', color: 'var(--stone)', marginTop: '0.35rem' }}>Un email de confirmation vous sera envoyé si renseigné.</p>
            </div>

            <div style={{ paddingTop: '0.5rem' }}>
              <button type="submit" className="btn btn--solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.75rem' }}>
                Procéder au paiement sécurisé →
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--line)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)' }}>
            🔒 Paiement sécurisé Sherlocks — LCL
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--stone)' }}>
          Une question sur votre règlement ? <a href="mailto:contact@samparis12.org" style={{ color: 'var(--vermilion)', textDecoration: 'underline' }}>contact@samparis12.org</a>
        </div>
      </div>

      <footer style={{ textAlign: 'center', paddingBlock: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--stone)', textTransform: 'uppercase' }}>
        SAM Paris 12 — Paiement sécurisé · 2026-2027
      </footer>
    </div>
  )
}
