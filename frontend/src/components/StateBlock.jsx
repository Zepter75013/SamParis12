export function Loading({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center py-16 text-gray-500">
      <span className="animate-pulse">{label}</span>
    </div>
  )
}

export function ErrorBlock({ message = "Une erreur est survenue." }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-6 text-center">
      {message}
    </div>
  )
}

export function EmptyBlock({ message = 'Rien à afficher pour le moment.' }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 text-gray-500 px-4 py-10 text-center">
      {message}
    </div>
  )
}
