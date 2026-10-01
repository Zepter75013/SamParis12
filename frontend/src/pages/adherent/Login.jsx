import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { getToken, setToken, clearToken } from '../../lib/session.js'
import PasswordField from '../../components/PasswordField.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState('login') // 'login' | 'code'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // Un jeton local valide existe déjà (session précédente) : on saute
  // directement au tableau de bord plutôt que de forcer une reconnexion.
  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.getMe(token)
      .then(() => navigate('/espace-adherent/tableau-de-bord'))
      .catch(() => clearToken())
  }, [navigate])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await api.login(email, password)
      setToken(token)
      navigate('/espace-adherent/tableau-de-bord')
    } catch (err) {
      if (err.data?.mustChangePassword) {
        setInfo("Première connexion : un code vous a été envoyé par email pour définir votre mot de passe.")
        setStep('code')
        try {
          await api.requestCode(email)
        } catch {
          // silencieux : on affiche quand même le formulaire de code
        }
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Renseignez votre adresse email ci-dessus avant de demander un code.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.requestCode(email)
      setInfo('Si un compte existe avec cette adresse, un code vient de vous être envoyé par email.')
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmCode(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== newPassword2) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const { token } = await api.confirmCode(email, code, newPassword)
      setToken(token)
      navigate('/espace-adherent/tableau-de-bord')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
          {info && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>{info}</p>
          )}
          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--vermilion)', marginBottom: '1rem' }}>{error}</p>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                  Email
                </label>
                <input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                  Mot de passe
                </label>
                <PasswordField className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <div style={{ paddingTop: '0.5rem' }}>
                <button type="submit" disabled={loading} className="btn btn--solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.75rem' }}>
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
              </div>

              <button type="button" onClick={handleForgotPassword} className="link-button" style={{ justifySelf: 'center' }}>
                Mot de passe oublié ?
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setInfo(''); setStep('code') }}
                className="link-button"
                style={{ justifySelf: 'center', fontSize: '0.7rem', color: 'var(--stone)' }}
              >
                J'ai déjà un code (communiqué par le bureau)
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleConfirmCode} style={{ display: 'grid', gap: '1.2rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                  Code reçu par email
                </label>
                <input type="text" inputMode="numeric" className="login-input" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                  Nouveau mot de passe
                </label>
                <PasswordField className="login-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', textTransform: 'uppercase', color: 'var(--stone)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                  Confirmer le mot de passe
                </label>
                <PasswordField className="login-input" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} required />
              </div>

              <div style={{ paddingTop: '0.5rem' }}>
                <button type="submit" disabled={loading} className="btn btn--solid" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.75rem' }}>
                  {loading ? 'Validation…' : 'Valider et me connecter'}
                </button>
              </div>

              <button type="button" onClick={() => setStep('login')} className="link-button" style={{ justifySelf: 'center' }}>
                ← Retour à la connexion
              </button>
            </form>
          )}
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
