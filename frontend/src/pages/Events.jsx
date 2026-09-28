import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { Loading, ErrorBlock, EmptyBlock } from '../components/StateBlock.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Events() {
  const { data: events, error, loading } = useFetch(() => api.getEvents(), [])

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold">Calendrier</h1>
      <p className="mt-4 text-gray-600">Compétitions, stages et événements du club à venir.</p>

      <div className="mt-10">
        {loading && <Loading />}
        {error && <ErrorBlock message="Impossible de charger le calendrier." />}
        {events?.length === 0 && <EmptyBlock message="Aucun événement programmé." />}

        <ul className="space-y-4">
          {events?.map((ev) => (
            <li key={ev.id} className="rounded-xl border border-gray-200 p-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-lg">{ev.title}</h2>
                {ev.category && (
                  <span className="text-xs font-semibold uppercase text-club-red bg-red-50 px-2 py-1 rounded">
                    {ev.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1 capitalize">{formatDate(ev.startAt)}</p>
              {ev.location && <p className="text-sm text-gray-600 mt-1">📍 {ev.location}</p>}
              {ev.description && <p className="mt-3 text-gray-600 text-sm">{ev.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
