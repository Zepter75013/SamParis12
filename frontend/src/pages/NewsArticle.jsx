import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useFetch } from '../lib/useFetch.js'
import { Loading, ErrorBlock } from '../components/StateBlock.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function NewsArticle() {
  const { slug } = useParams()
  const { data: article, error, loading } = useFetch(() => api.getArticle(slug), [slug])

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/actualites" className="text-club-red font-semibold hover:underline text-sm">
        ← Toutes les actualités
      </Link>

      {loading && <Loading />}
      {error && <ErrorBlock message="Cet article est introuvable." />}

      {article && (
        <article className="mt-6">
          <p className="text-sm text-gray-500">{formatDate(article.publishedAt)}</p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2">{article.title}</h1>
          <div className="mt-6 text-gray-700 leading-relaxed whitespace-pre-line">
            {article.content}
          </div>
        </article>
      )}
    </div>
  )
}
