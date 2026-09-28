import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { Loading, ErrorBlock, EmptyBlock } from '../components/StateBlock.jsx'

export default function Partners() {
  const { data: partners, error, loading } = useFetch(() => api.getPartners(), [])

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold">Nos partenaires</h1>
      <p className="mt-4 text-gray-600">Ils soutiennent le club et ses athlètes.</p>

      <div className="mt-10">
        {loading && <Loading />}
        {error && <ErrorBlock message="Impossible de charger les partenaires." />}
        {partners?.length === 0 && <EmptyBlock message="Aucun partenaire renseigné." />}

        <div className="grid gap-6 sm:grid-cols-2">
          {partners?.map((p) => (
            <a
              key={p.id}
              href={p.websiteUrl || undefined}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-gray-200 p-6 bg-white hover:shadow-md transition-shadow flex items-center gap-4"
            >
              {p.logoUrl ? (
                <img src={p.logoUrl} alt={p.name} className="h-12 w-auto" />
              ) : (
                <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  Logo
                </div>
              )}
              <span className="font-semibold">{p.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
