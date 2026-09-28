const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Erreur ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getNews: () => request('/news'),
  getArticle: (slug) => request(`/news/${slug}`),
  getEvents: () => request('/events'),
  getGroups: () => request('/groups'),
  getPartners: () => request('/partners'),
  sendContact: (payload) =>
    request('/contact', { method: 'POST', body: JSON.stringify(payload) }),
}
