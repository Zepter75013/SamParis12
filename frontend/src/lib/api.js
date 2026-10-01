const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

async function request(path, { token, headers, ...options } = {}) {
  // Pour un FormData (upload de fichier), laisser le navigateur poser son
  // propre Content-Type (multipart/form-data + boundary) plutôt que forcer JSON.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const finalHeaders = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...headers }
  if (token) finalHeaders.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: finalHeaders })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `Erreur ${res.status}`)
    err.data = body
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getPartners: () => request('/partners'),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  requestCode: (email) =>
    request('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmCode: (email, code, newPassword) =>
    request('/auth/confirm-code', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),

  getMe: (token) => request('/members/me', { token }),
  updateMe: (token, data) => request('/members/me', { method: 'PUT', token, body: JSON.stringify(data) }),
  updateTrombi: (token, data) => request('/members/me/trombi', { method: 'PUT', token, body: JSON.stringify(data) }),
  updateEmail: (token, newEmail) =>
    request('/members/me/email', { method: 'PUT', token, body: JSON.stringify({ newEmail }) }),
  listMembers: (token) => request('/members', { token }),
  uploadPhoto: (token, file) => {
    const form = new FormData()
    form.append('photo', file)
    return request('/members/me/photo', { method: 'POST', token, body: form })
  },

  adminListMembers: (token) => request('/admin/members', { token }),
  adminGetMember: (token, id) => request(`/admin/members/${id}`, { token }),
  adminCreateMember: (token, data) =>
    request('/admin/members', { method: 'POST', token, body: JSON.stringify(data) }),
  adminUpdateMember: (token, id, data) =>
    request(`/admin/members/${id}`, { method: 'PUT', token, body: JSON.stringify(data) }),
  adminDeleteMember: (token, id) =>
    request(`/admin/members/${id}`, { method: 'DELETE', token }),
  adminUpdateEmail: (token, id, newEmail) =>
    request(`/admin/members/${id}/email`, { method: 'PUT', token, body: JSON.stringify({ newEmail }) }),
  adminSendWelcomeEmail: (token, id) =>
    request(`/admin/members/${id}/send-welcome-email`, { method: 'POST', token }),

  listRaces: (token) => request('/races', { token }),
  createRace: (token, data) => request('/races', { method: 'POST', token, body: JSON.stringify(data) }),
  getRace: (token, id) => request(`/races/${id}`, { token }),
  registerRace: (token, id) => request(`/races/${id}/register`, { method: 'POST', token }),
  unregisterRace: (token, id) => request(`/races/${id}/register`, { method: 'DELETE', token }),
  seekDossard: (token, id) => request(`/races/${id}/dossard/recherche`, { method: 'POST', token }),
  unseekDossard: (token, id) => request(`/races/${id}/dossard/recherche`, { method: 'DELETE', token }),
  cedeDossard: (token, id) => request(`/races/${id}/dossard/cession`, { method: 'POST', token }),
  uncedeDossard: (token, id) => request(`/races/${id}/dossard/cession`, { method: 'DELETE', token }),
  upsertRaceResult: (token, raceId, memberId, data) =>
    request(`/races/${raceId}/results/${memberId}`, { method: 'PUT', token, body: JSON.stringify(data) }),
  deleteRaceResult: (token, raceId, memberId) =>
    request(`/races/${raceId}/results/${memberId}`, { method: 'DELETE', token }),

  listDocuments: (token) => request('/documents', { token }),
  uploadDocument: (token, formData) => request('/documents', { method: 'POST', token, body: formData }),
}
