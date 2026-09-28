import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-display text-6xl text-club-red">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page introuvable</h1>
      <Link to="/" className="mt-6 inline-block text-club-red font-semibold hover:underline">
        ← Retour à l'accueil
      </Link>
    </div>
  )
}
