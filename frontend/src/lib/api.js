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

export const chatStreamUrl = () => `${BASE_URL}/chat/stream`

// Lien d'une pièce jointe de la messagerie (l'API renvoie un chemin signé commençant par /api/).
export const chatFileUrl = (u) => (u && u.startsWith('/') ? `${BASE_URL.replace(/\/api$/, '')}${u}` : u)

export const api = {
  getPartners: () => request('/partners'),
  getPublicRaces: () => request('/public/races'),
  getPublicResults: () => request('/public/results'),
  getPublicRecords: () => request('/public/records'),
  getPublicStats: () => request('/public/stats'),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  requestCode: (email) =>
    request('/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyCode: (email, code) =>
    request('/auth/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
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
  adminGenerateCode: (token, id) =>
    request(`/admin/members/${id}/generate-code`, { method: 'POST', token }),

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
  getMemberResults: (token, memberId, limit) =>
    request(`/members/${memberId}/race-results${limit ? `?limit=${limit}` : ''}`, { token }),
  getMemberUpcomingRaces: (token, memberId) =>
    request(`/members/${memberId}/upcoming-races`, { token }),
  getClubRecords: (token) => request('/records', { token }),

  getGameLeaderboard: (token) => request('/game/leaderboard', { token }),
  postGameScore: (token, meters) => request('/game/score', { method: 'POST', token, body: JSON.stringify({ meters }) }),

  chatRooms: (token) => request('/chat/rooms', { token }),
  chatMessages: (token, roomId, before) => request(`/chat/rooms/${roomId}/messages${before ? `?before=${before}` : ''}`, { token }),
  chatSend: (token, roomId, texte, replyTo) =>
    request(`/chat/rooms/${roomId}/messages`, { method: 'POST', token, body: JSON.stringify({ texte, replyTo: replyTo || 0 }) }),
  chatRead: (token, roomId, upTo) => request(`/chat/rooms/${roomId}/read`, { method: 'POST', token, body: JSON.stringify({ upTo }) }),
  chatEdit: (token, messageId, texte) => request(`/chat/messages/${messageId}`, { method: 'PUT', token, body: JSON.stringify({ texte }) }),
  chatArchive: (token, roomId, archived) =>
    request(`/chat/rooms/${roomId}/archive`, { method: 'POST', token, body: JSON.stringify({ archived }) }),
  chatDeleteRoom: (token, roomId) => request(`/chat/rooms/${roomId}`, { method: 'DELETE', token }),
  chatSendMedia: (token, roomId, files, texte, replyTo) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f, f.name))
    if (texte) form.append('texte', texte)
    if (replyTo) form.append('replyTo', String(replyTo))
    return request(`/chat/rooms/${roomId}/attachments`, { method: 'POST', token, body: form })
  },
  chatSendPoll: (token, roomId, data) => request(`/chat/rooms/${roomId}/polls`, { method: 'POST', token, body: JSON.stringify(data) }),
  chatSendEvent: (token, roomId, data) => request(`/chat/rooms/${roomId}/events`, { method: 'POST', token, body: JSON.stringify(data) }),
  chatVote: (token, messageId, optionIds) =>
    request(`/chat/messages/${messageId}/vote`, { method: 'POST', token, body: JSON.stringify({ optionIds }) }),
  chatRsvp: (token, messageId, reponse) =>
    request(`/chat/messages/${messageId}/rsvp`, { method: 'POST', token, body: JSON.stringify({ reponse }) }),
  chatDelete: (token, messageId) => request(`/chat/messages/${messageId}`, { method: 'DELETE', token }),
  chatOpenDM: (token, memberId) => request('/chat/dm', { method: 'POST', token, body: JSON.stringify({ memberId }) }),
  chatCreateRoom: (token, nom, memberIds) => request('/chat/rooms', { method: 'POST', token, body: JSON.stringify({ nom, memberIds }) }),
  chatAddMembers: (token, roomId, memberIds) =>
    request(`/chat/rooms/${roomId}/members`, { method: 'POST', token, body: JSON.stringify({ memberIds }) }),

  listDocuments: (token) => request('/documents', { token }),
  uploadDocument: (token, formData) => request('/documents', { method: 'POST', token, body: formData }),
}
