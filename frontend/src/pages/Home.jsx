import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { Loading } from '../components/StateBlock.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Home() {
  const { data: news } = useFetch(() => api.getNews(), [])
  const { data: events } = useFetch(() => api.getEvents(), [])
  const { data: groups } = useFetch(() => api.getGroups(), [])

  return (
    <div>
      <section className="relative overflow-hidden bg-club-ink text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-club-red/90 via-club-ink to-club-ink" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <p className="uppercase tracking-[0.3em] text-sm text-red-200 font-semibold">
            Club d'athlétisme — Paris 12e
          </p>
          <h1 className="mt-4 font-display text-5xl sm:text-7xl tracking-wide">
            SAM PARIS 12
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-200">
            De l'école d'athlétisme aux compétitions nationales, courez, sautez et lancez
            avec nous, dans le 12e arrondissement de Paris.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/sections"
              className="rounded-md bg-club-red px-6 py-3 font-semibold hover:bg-club-red-dark transition-colors"
            >
              Découvrir nos sections
            </Link>
            <Link
              to="/contact"
              className="rounded-md border border-white/40 px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
            >
              Nous rejoindre
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Nos sections</h2>
          <Link to="/sections" className="text-club-red font-semibold hover:underline hidden sm:block">
            Toutes les sections →
          </Link>
        </div>

        {!groups && <Loading />}
        {groups && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.slice(0, 3).map((g) => (
              <div key={g.id} className="rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow bg-white">
                <h3 className="font-bold text-lg">{g.name}</h3>
                <p className="text-sm text-club-red font-semibold mt-1">{g.ageRange}</p>
                <p className="mt-3 text-gray-600 text-sm">{g.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 grid gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Actualités</h2>
              <Link to="/actualites" className="text-club-red font-semibold hover:underline">
                Tout voir →
              </Link>
            </div>
            {!news && <Loading />}
            {news?.length === 0 && <p className="text-gray-500">Aucune actualité publiée.</p>}
            <ul className="space-y-4">
              {news?.slice(0, 3).map((article) => (
                <li key={article.id}>
                  <Link
                    to={`/actualites/${article.slug}`}
                    className="block rounded-lg bg-white border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
                    <h3 className="font-semibold mt-1">{article.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Prochains rendez-vous</h2>
              <Link to="/calendrier" className="text-club-red font-semibold hover:underline">
                Calendrier →
              </Link>
            </div>
            {!events && <Loading />}
            {events?.length === 0 && <p className="text-gray-500">Aucun événement à venir.</p>}
            <ul className="space-y-4">
              {events?.slice(0, 3).map((ev) => (
                <li key={ev.id} className="flex gap-4 rounded-lg bg-white border border-gray-200 p-4">
                  <div className="shrink-0 w-16 text-center">
                    <p className="font-display text-2xl text-club-red leading-none">
                      {new Date(ev.startAt).getDate()}
                    </p>
                    <p className="text-xs uppercase text-gray-500">
                      {new Date(ev.startAt).toLocaleDateString('fr-FR', { month: 'short' })}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">{ev.title}</h3>
                    <p className="text-sm text-gray-600">{ev.location}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
