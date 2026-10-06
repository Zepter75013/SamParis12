import { useCallback, useEffect, useRef, useState } from 'react'
import { api, chatStreamUrl } from './api.js'

// Aperçu d'un message dans la liste des discussions.
export function apercu(m) {
  if (m.kind === 'poll') return `📊 ${m.poll?.question || 'Sondage'}`
  if (m.kind === 'event') return `📅 ${m.event?.titre || 'Événement'}`
  if (m.kind === 'media') {
    const first = m.attachments?.[0]
    const icon = first?.kind === 'image' ? '📷' : first?.kind === 'video' ? '🎥' : '📄'
    return `${icon} ${m.texte || (first?.kind === 'image' ? 'Photo' : first?.kind === 'video' ? 'Vidéo' : 'Document')}`
  }
  return m.texte
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseFrame(frame) {
  let event = 'message'
  const data = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trim())
  }
  if (data.length === 0) return null
  try { return { event, data: JSON.parse(data.join('\n')) } } catch { return null }
}

// Messagerie : salons, conversations ouvertes et flux temps réel (événements serveur lus avec fetch,
// pour pouvoir envoyer le jeton dans l'en-tête Authorization plutôt que dans l'URL).
export function useChat(token, meId) {
  const [rooms, setRooms] = useState([])
  const [canCreate, setCanCreate] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [convs, setConvs] = useState({}) // roomId -> { messages, participants, otherRead, more, loading }
  const [openId, setOpenIdState] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [online, setOnline] = useState(true)

  const openRef = useRef(null)
  const panelRef = useRef(false)
  const roomsRef = useRef([])
  const convsRef = useRef({})
  const tempSeq = useRef(0)
  roomsRef.current = rooms
  convsRef.current = convs
  openRef.current = openId
  panelRef.current = panelOpen

  const refreshRooms = useCallback(async () => {
    if (!token) return
    const data = await api.chatRooms(token)
    setRooms(data.rooms)
    setCanCreate(data.canCreate)
    setLoaded(true)
  }, [token])

  const patchConv = useCallback((roomId, fn) => {
    setConvs((c) => ({ ...c, [roomId]: fn(c[roomId] || { messages: [], participants: [], otherRead: 0, more: false, loading: false, loaded: false }) }))
  }, [])

  const markRead = useCallback((roomId) => {
    const conv = convsRef.current[roomId]
    if (!conv || !token) return
    const last = [...conv.messages].reverse().find((m) => m.id > 0)
    if (!last) return
    setRooms((rs) => rs.map((r) => (r.id === roomId && r.unread > 0 ? { ...r, unread: 0 } : r)))
    api.chatRead(token, roomId, last.id).catch(() => {})
  }, [token])

  const loadConv = useCallback(async (roomId) => {
    patchConv(roomId, (c) => ({ ...c, loading: true }))
    try {
      const data = await api.chatMessages(token, roomId)
      patchConv(roomId, (c) => ({
        ...c, loading: false, loaded: true, messages: data.messages, participants: data.participants || [], otherRead: data.otherRead || 0, more: data.more,
      }))
    } catch {
      patchConv(roomId, (c) => ({ ...c, loading: false }))
    }
  }, [token, patchConv])

  const loadMore = useCallback(async (roomId) => {
    const conv = convsRef.current[roomId]
    if (!conv || conv.loading || !conv.more || conv.messages.length === 0) return
    const first = conv.messages.find((m) => m.id > 0)
    if (!first) return
    patchConv(roomId, (c) => ({ ...c, loading: true }))
    try {
      const data = await api.chatMessages(token, roomId, first.id)
      patchConv(roomId, (c) => ({ ...c, loading: false, messages: [...data.messages, ...c.messages], more: data.more }))
    } catch {
      patchConv(roomId, (c) => ({ ...c, loading: false }))
    }
  }, [token, patchConv])

  const openRoom = useCallback((roomId) => {
    setOpenIdState(roomId)
    if (roomId != null) loadConv(roomId)
  }, [loadConv])

  // marque lu quand la conversation est ouverte, visible et à jour
  useEffect(() => {
    if (openId == null || !panelOpen) return
    const conv = convs[openId]
    if (!conv || conv.loading) return
    if (document.visibilityState === 'visible') markRead(openId)
  }, [openId, panelOpen, convs, markRead])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && openRef.current != null && panelRef.current) markRead(openRef.current)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [markRead])

  useEffect(() => {
    if (!token || !meId) return undefined
    let stop = false
    let ctrl = null

    const onEvent = ({ event, data }) => {
      if (event === 'message') {
        const { roomId, message } = data
        if (convsRef.current[roomId]) {
          patchConv(roomId, (c) => (c.messages.some((m) => m.id === message.id) ? c : { ...c, messages: [...c.messages, message] }))
        }
        const known = roomsRef.current.some((r) => r.id === roomId)
        if (!known) { refreshRooms().catch(() => {}); return }
        const seen = openRef.current === roomId && panelRef.current && document.visibilityState === 'visible'
        setRooms((rs) => rs.map((r) => (r.id === roomId
          ? { ...r, last: { id: message.id, auteur: message.auteur, texte: apercu(message), createdAt: message.createdAt }, unread: message.senderId === meId || seen ? r.unread : r.unread + 1 }
          : r)))
      } else if (event === 'read') {
        if (data.memberId !== meId) patchConv(data.roomId, (c) => ({ ...c, otherRead: Math.max(c.otherRead || 0, data.upTo) }))
      } else if (event === 'poll') {
        // les compteurs viennent du serveur ; mes propres choix restent ceux que j'ai faits ici
        patchConv(data.roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === data.messageId && m.poll ? { ...m, poll: { ...data.poll, mine: m.poll.mine || [] } } : m)) }))
      } else if (event === 'event') {
        patchConv(data.roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === data.messageId && m.event ? { ...m, event: { ...data.event, mine: m.event.mine || '' } } : m)) }))
      } else if (event === 'edit') {
        patchConv(data.roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === data.message.id ? data.message : m)) }))
        refreshRooms().catch(() => {})
      } else if (event === 'delete') {
        patchConv(data.roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === data.messageId ? { ...m, deleted: true, texte: '' } : m)) }))
        refreshRooms().catch(() => {})
      } else if (event === 'rooms') {
        refreshRooms().catch(() => {})
      }
    }

    async function run() {
      let delay = 1000
      while (!stop) {
        ctrl = new AbortController()
        try {
          const res = await fetch(chatStreamUrl(), { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal })
          if (res.status === 401) return
          if (!res.ok) throw new Error(String(res.status))
          delay = 1000
          setOnline(true)
          await refreshRooms().catch(() => {})
          if (openRef.current != null) await loadConv(openRef.current)
          const reader = res.body.getReader()
          const dec = new TextDecoder()
          let buf = ''
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            let i
            while ((i = buf.indexOf('\n\n')) >= 0) {
              const frame = parseFrame(buf.slice(0, i))
              buf = buf.slice(i + 2)
              if (frame) onEvent(frame)
            }
          }
        } catch {
          if (stop) return
        }
        setOnline(false)
        await sleep(delay)
        delay = Math.min(delay * 2, 15000)
      }
    }
    run()
    return () => { stop = true; if (ctrl) ctrl.abort() }
  }, [token, meId, refreshRooms, loadConv, patchConv])

  const send = useCallback(async (roomId, texte, reply) => {
    const tempId = -(++tempSeq.current)
    const temp = {
      id: tempId, roomId, senderId: meId, auteur: '', photoUrl: '', texte, deleted: false, pending: true,
      reply: reply ? { id: reply.id, auteur: reply.auteur, texte: apercu(reply) } : null, createdAt: new Date().toISOString(),
    }
    patchConv(roomId, (c) => ({ ...c, messages: [...c.messages, temp] }))
    try {
      const msg = await api.chatSend(token, roomId, texte, reply ? reply.id : 0)
      patchConv(roomId, (c) => {
        const without = c.messages.filter((m) => m.id !== tempId)
        return { ...c, messages: without.some((m) => m.id === msg.id) ? without : [...without, msg] }
      })
      setRooms((rs) => rs.map((r) => (r.id === roomId ? { ...r, last: { id: msg.id, auteur: msg.auteur, texte: apercu(msg), createdAt: msg.createdAt } } : r)))
    } catch (err) {
      patchConv(roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)) }))
      throw err
    }
  }, [token, meId, patchConv])

  const remove = useCallback(async (messageId) => {
    await api.chatDelete(token, messageId)
  }, [token])

  // Ajoute un message reçu en réponse d'un envoi (sans doublon avec le flux temps réel).
  const addSent = useCallback((roomId, msg) => {
    patchConv(roomId, (c) => (c.messages.some((m) => m.id === msg.id) ? c : { ...c, messages: [...c.messages, msg] }))
    setRooms((rs) => rs.map((r) => (r.id === roomId ? { ...r, last: { id: msg.id, auteur: msg.auteur, texte: apercu(msg), createdAt: msg.createdAt } } : r)))
  }, [patchConv])

  const sendMedia = useCallback(async (roomId, files, texte, reply) => {
    addSent(roomId, await api.chatSendMedia(token, roomId, files, texte, reply ? reply.id : 0))
  }, [token, addSent])
  const sendPoll = useCallback(async (roomId, data) => {
    addSent(roomId, await api.chatSendPoll(token, roomId, data))
  }, [token, addSent])
  const sendEvent = useCallback(async (roomId, data) => {
    addSent(roomId, await api.chatSendEvent(token, roomId, data))
  }, [token, addSent])

  const vote = useCallback(async (roomId, messageId, optionIds) => {
    const msg = await api.chatVote(token, messageId, optionIds)
    patchConv(roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msg.id ? { ...m, poll: msg.poll } : m)) }))
  }, [token, patchConv])
  const rsvp = useCallback(async (roomId, messageId, reponse) => {
    const msg = await api.chatRsvp(token, messageId, reponse)
    patchConv(roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msg.id ? { ...m, event: msg.event } : m)) }))
  }, [token, patchConv])

  // Modifier un message : possible tant qu'aucun autre adhérent ne l'a lu (le serveur refuse sinon).
  const edit = useCallback(async (roomId, messageId, texte) => {
    const msg = await api.chatEdit(token, messageId, texte)
    patchConv(roomId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msg.id ? msg : m)) }))
    refreshRooms().catch(() => {})
  }, [token, patchConv, refreshRooms])

  // Archiver / désarchiver : propre à chaque adhérent.
  const archive = useCallback(async (roomId, archived) => {
    await api.chatArchive(token, roomId, archived)
    setRooms((rs) => rs.map((r) => (r.id === roomId ? { ...r, archived } : r)))
  }, [token])

  // Supprimer : la discussion disparaît de l'écran (elle reste en base, réactivable uniquement par l'administrateur de la base).
  const removeRoom = useCallback(async (roomId) => {
    await api.chatDeleteRoom(token, roomId)
    setRooms((rs) => rs.filter((r) => r.id !== roomId))
    setConvs((c) => { const next = { ...c }; delete next[roomId]; return next })
    if (openRef.current === roomId) setOpenIdState(null)
  }, [token])

  // les discussions archivées ne comptent pas dans la pastille de l'onglet
  const unreadTotal = rooms.reduce((n, r) => n + (r.archived ? 0 : r.unread || 0), 0)

  return { rooms, canCreate, loaded, convs, openId, openRoom, loadMore, send, remove, edit, archive, removeRoom, sendMedia, sendPoll, sendEvent, vote, rsvp, refreshRooms, unreadTotal, setPanelOpen, online }
}
