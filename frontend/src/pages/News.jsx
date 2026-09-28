import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { Loading, ErrorBlock, EmptyBlock } from '../components/StateBlock.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function News() {
  const { data: news, error, loading } = useFetch(() => api.getNews(), [])

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-bold">Actualités</h1>

      <div className="mt-10">
        {loading && <Loading />}
        {error && <ErrorBlock message="Impossible de charger les actualités." />}
        {news?.length === 0 && <EmptyBlock message="Aucune actualité publiée pour le moment." />}

        <ul className="space-y-6">
          {news?.map((article) => (
            <li key={article.id}>
              <Link
                to={`/actualites/${article.slug}`}
                className="block rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow bg-white"
              >
                <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
                <h2 className="font-bold text-xl mt-1">{article.title}</h2>
                <p className="text-gray-600 mt-2">{article.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
