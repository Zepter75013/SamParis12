import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { Loading, ErrorBlock, EmptyBlock } from '../components/StateBlock.jsx'

export default function Groups() {
  const { data: groups, error, loading } = useFetch(() => api.getGroups(), [])

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold">Sections & entraînements</h1>
      <p className="mt-4 text-gray-600 max-w-2xl">
        Retrouvez toutes nos sections, du plus jeune âge aux athlètes confirmés, ainsi que les
        créneaux d'entraînement.
      </p>

      <div className="mt-10">
        {loading && <Loading />}
        {error && <ErrorBlock message="Impossible de charger les sections." />}
        {groups?.length === 0 && <EmptyBlock message="Aucune section renseignée." />}

        {groups && groups.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {groups.map((g) => (
              <div key={g.id} className="rounded-xl border border-gray-200 p-6 bg-white">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-bold text-xl">{g.name}</h2>
                  <span className="text-xs font-semibold uppercase text-club-red">{g.level}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{g.ageRange}</p>
                <p className="mt-3 text-gray-600 text-sm">{g.description}</p>
                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="font-semibold text-gray-700">Créneaux :</dt>
                    <dd className="text-gray-600">{g.schedule}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-semibold text-gray-700">Encadrement :</dt>
                    <dd className="text-gray-600">{g.coach}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
