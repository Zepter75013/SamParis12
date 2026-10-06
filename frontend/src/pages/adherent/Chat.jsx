import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

const EMOJIS = ['😀', '😂', '😅', '😍', '🥰', '😎', '🤩', '🙂', '😉', '🙏', '👍', '👏', '🙌', '💪', '🔥', '🎉', '❤️', '😢', '😮', '🤔',
  '🏃', '🏃‍♀️', '🚶', '🥇', '🏅', '🏆', '⏱️', '👟', '☀️', '🌧️', '💧', '🍌', '🍝', '🍻', '🚗', '📍', '✅', '❌', '⚠️', '👋']

function initiales(nom) {
  return (nom || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function Avatar({ photoUrl, nom, size = 40, groupe }) {
  const style = { width: size, height: size, fontSize: size * 0.38 }
  if (photoUrl) return <img className="chat-avatar" src={photoUrl} alt="" style={style} />
  return <span className={`chat-avatar chat-avatar--${groupe ? 'groupe' : 'init'}`} style={style}>{groupe ? '👥' : initiales(nom)}</span>
}

const sameDay = (a, b) => a.toDateString() === b.toDateString()
function jourLabel(d) {
  const now = new Date()
  const hier = new Date(now); hier.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return "Aujourd'hui"
  if (sameDay(d, hier)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
function heureListe(iso) {
  const d = new Date(iso)
  const now = new Date()
  const hier = new Date(now); hier.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return heure(iso)
  if (sameDay(d, hier)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// couleur stable par auteur dans les salons (comme WhatsApp)
const COULEURS = ['#c2410c', '#0f766e', '#7c3aed', '#be185d', '#1d4ed8', '#a16207', '#047857', '#b91c1c']
const couleurDe = (id) => COULEURS[Math.abs(id) % COULEURS.length]

function Coches({ message, room, otherRead }) {
  if (message.failed) return <span className="chat-tick chat-tick--err" title="Non envoyé">!</span>
  if (message.pending) return <span className="chat-tick">🕓</span>
  const lu = room.kind === 'dm' && message.id <= otherRead
  return <span className={`chat-tick${lu ? ' is-read' : ''}`} title={lu ? 'Lu' : 'Envoyé'}>{room.kind === 'dm' ? '✓✓' : '✓'}</span>
}

function Bulle({ message, room, me, otherRead, onReply, onDelete, showAuteur }) {
  const mine = message.senderId === me.id
  const canDelete = !message.deleted && !message.pending && (mine || me.isBureau)
  return (
    <div className={`chat-row${mine ? ' is-mine' : ''}`}>
      <div className={`chat-bubble${mine ? ' is-mine' : ''}${message.deleted ? ' is-deleted' : ''}`} tabIndex={0}>
        {!mine && showAuteur && room.kind !== 'dm' && (
          <b className="chat-author" style={{ color: couleurDe(message.senderId) }}>{message.auteur}</b>
        )}
        {message.reply && (
          <div className="chat-quote">
            <b>{message.reply.auteur}</b>
            <span>{message.reply.texte || '🚫 Message supprimé'}</span>
          </div>
        )}
        {message.deleted
          ? <span className="chat-body">🚫 Message supprimé</span>
          : <span className="chat-body">{message.texte}</span>}
        <span className="chat-meta">
          {heure(message.createdAt)}
          {mine && !message.deleted && <Coches message={message} room={room} otherRead={otherRead} />}
        </span>
        {!message.deleted && !message.pending && !message.failed && (
          <span className="chat-actions">
            <button type="button" title="Répondre" onClick={() => onReply(message)}>↩</button>
            {canDelete && <button type="button" title="Supprimer" onClick={() => onDelete(message)}>🗑</button>}
          </span>
        )}
      </div>
    </div>
  )
}

function Modal({ titre, onClose, children }) {
  return (
    <div className="chat-modal" onClick={onClose}>
      <div className="chat-modal__box" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal__head">
          <b>{titre}</b>
          <button type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ChoixMembres({ members, meId, exclude = [], multiple, selected, onToggle }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return members
      .filter((m) => m.id !== meId && !exclude.includes(m.id))
      .filter((m) => !t || `${m.prenom} ${m.nom}`.toLowerCase().includes(t))
      .sort((a, b) => `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, 'fr'))
  }, [members, meId, exclude, q])
  return (
    <>
      <input className="chat-search" placeholder="Rechercher un adhérent…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="chat-pick">
        {list.map((m) => (
          <button type="button" key={m.id} className={`chat-pick__row${selected?.includes(m.id) ? ' is-on' : ''}`} onClick={() => onToggle(m)}>
            <Avatar photoUrl={m.photoUrl} nom={`${m.prenom} ${m.nom}`} size={36} />
            <span>{m.prenom} {m.nom}</span>
            {multiple && <i>{selected?.includes(m.id) ? '☑' : '☐'}</i>}
          </button>
        ))}
        {list.length === 0 && <p className="chat-empty">Aucun adhérent trouvé.</p>}
      </div>
    </>
  )
}

function NouvelleDiscussion({ chat, token, me, members, onClose }) {
  const [onglet, setOnglet] = useState('dm')
  const [nom, setNom] = useState('')
  const [choisis, setChoisis] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function ouvrirDM(m) {
    setBusy(true)
    try {
      const { roomId } = await api.chatOpenDM(token, m.id)
      await chat.refreshRooms()
      chat.openRoom(roomId)
      onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  async function creer() {
    setBusy(true)
    setErr('')
    try {
      const { roomId } = await api.chatCreateRoom(token, nom, choisis)
      await chat.refreshRooms()
      chat.openRoom(roomId)
      onClose()
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  const toggle = (m) => setChoisis((c) => (c.includes(m.id) ? c.filter((x) => x !== m.id) : [...c, m.id]))

  return (
    <Modal titre="Nouvelle discussion" onClose={onClose}>
      {chat.canCreate && (
        <div className="chat-tabs">
          <button type="button" className={onglet === 'dm' ? 'is-on' : ''} onClick={() => setOnglet('dm')}>Message privé</button>
          <button type="button" className={onglet === 'salon' ? 'is-on' : ''} onClick={() => setOnglet('salon')}>Nouveau salon</button>
        </div>
      )}
      {err && <p className="chat-error">{err}</p>}
      {onglet === 'dm' && <ChoixMembres members={members} meId={me.id} onToggle={(m) => !busy && ouvrirDM(m)} />}
      {onglet === 'salon' && (
        <>
          <input className="chat-search" placeholder="Nom du salon (ex. Covoiturage Paris-Reims)" maxLength={100} value={nom} onChange={(e) => setNom(e.target.value)} />
          <ChoixMembres members={members} meId={me.id} multiple selected={choisis} onToggle={toggle} />
          <button type="button" className="btn btn--solid chat-create" disabled={busy || !nom.trim()} onClick={creer}>
            Créer le salon ({choisis.length + 1} participant{choisis.length ? 's' : ''})
          </button>
        </>
      )}
    </Modal>
  )
}

function Participants({ room, conv, token, members, me, onClose, chat }) {
  const [ajout, setAjout] = useState(false)
  const [choisis, setChoisis] = useState([])
  const [err, setErr] = useState('')
  const deja = conv.participants.map((p) => p.id)
  async function ajouter() {
    try {
      await api.chatAddMembers(token, room.id, choisis)
      await chat.openRoom(room.id)
      onClose()
    } catch (e) { setErr(e.message) }
  }
  return (
    <Modal titre={`${room.nom} · ${conv.participants.length} participants`} onClose={onClose}>
      {err && <p className="chat-error">{err}</p>}
      {!ajout && (
        <>
          {room.canAdd && <button type="button" className="btn btn--ghost chat-create" onClick={() => setAjout(true)}>＋ Ajouter des participants</button>}
          <div className="chat-pick">
            {conv.participants.map((p) => (
              <div key={p.id} className="chat-pick__row is-static">
                <Avatar photoUrl={p.photoUrl} nom={p.nom} size={36} />
                <span>{p.nom}{p.id === me.id ? ' (toi)' : ''}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {ajout && (
        <>
          <ChoixMembres members={members} meId={me.id} exclude={deja} multiple selected={choisis} onToggle={(m) => setChoisis((c) => (c.includes(m.id) ? c.filter((x) => x !== m.id) : [...c, m.id]))} />
          <button type="button" className="btn btn--solid chat-create" disabled={choisis.length === 0} onClick={ajouter}>Ajouter {choisis.length || ''}</button>
        </>
      )}
    </Modal>
  )
}

function Conversation({ chat, room, token, me, members, onBack }) {
  const conv = chat.convs[room.id] || { messages: [], participants: [], otherRead: 0, more: false, loading: false, loaded: false }
  const [texte, setTexte] = useState('')
  const [reply, setReply] = useState(null)
  const [emoji, setEmoji] = useState(false)
  const [infos, setInfos] = useState(false)
  const [err, setErr] = useState('')
  const zone = useRef(null)
  const input = useRef(null)
  const bas = useRef(true)
  const prevH = useRef(0)

  // reste collé en bas sauf si l'adhérent remonte dans l'historique
  useLayoutEffect(() => {
    const z = zone.current
    if (!z) return
    if (prevH.current && !bas.current && z.scrollHeight > prevH.current && conv.messages.length) {
      z.scrollTop += z.scrollHeight - prevH.current // historique chargé au-dessus : on garde la position
    } else if (bas.current) {
      z.scrollTop = z.scrollHeight
    }
    prevH.current = z.scrollHeight
  }, [conv.messages])

  useEffect(() => { bas.current = true; setReply(null); setTexte(''); setErr(''); input.current?.focus() }, [room.id])

  function onScroll() {
    const z = zone.current
    bas.current = z.scrollHeight - z.scrollTop - z.clientHeight < 80
    if (z.scrollTop < 60 && conv.more && !conv.loading) { prevH.current = z.scrollHeight; chat.loadMore(room.id) }
  }

  async function envoyer() {
    const t = texte.trim()
    if (!t) return
    setTexte('')
    const r = reply
    setReply(null)
    setEmoji(false)
    bas.current = true
    try { await chat.send(room.id, t, r) } catch (e) { setErr(e.message) }
    input.current?.focus()
  }
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); envoyer() }
  }
  async function supprimer(m) {
    if (!window.confirm('Supprimer ce message pour tout le monde ?')) return
    try { await chat.remove(m.id) } catch (e) { setErr(e.message) }
  }

  // regroupement par jour
  const items = []
  let jour = ''
  conv.messages.forEach((m, i) => {
    const d = new Date(m.createdAt)
    const k = d.toDateString()
    if (k !== jour) { items.push({ sep: jourLabel(d), key: `s${k}` }); jour = k }
    const prev = conv.messages[i - 1]
    items.push({ m, showAuteur: !prev || prev.senderId !== m.senderId || new Date(prev.createdAt).toDateString() !== k, key: m.id })
  })

  const sousTitre = room.kind === 'dm'
    ? 'Message privé'
    : (conv.participants.length ? conv.participants.slice(0, 6).map((p) => p.nom.split(' ')[0]).join(', ') + (conv.participants.length > 6 ? '…' : '') : `${room.members} participants`)

  return (
    <section className="chat-conv">
      <header className="chat-conv__head">
        <button type="button" className="chat-back" onClick={onBack} aria-label="Retour aux discussions">←</button>
        <Avatar photoUrl={room.photoUrl} nom={room.nom} groupe={room.kind !== 'dm'} />
        <button type="button" className="chat-conv__title" onClick={() => room.kind !== 'dm' && setInfos(true)} disabled={room.kind === 'dm'}>
          <b>{room.nom}</b>
          <span>{sousTitre}</span>
        </button>
      </header>

      <div className="chat-scroll" ref={zone} onScroll={onScroll}>
        {conv.loading && conv.messages.length === 0 && <p className="chat-empty">Chargement…</p>}
        {conv.loaded && conv.messages.length === 0 && <p className="chat-empty">Aucun message. Écris le premier ! 👋</p>}
        {conv.more && <p className="chat-empty">Chargement de l'historique…</p>}
        {items.map((it) => (it.sep
          ? <div key={it.key} className="chat-day"><span>{it.sep}</span></div>
          : <Bulle key={it.key} message={it.m} room={room} me={me} otherRead={conv.otherRead} showAuteur={it.showAuteur}
              onReply={(m) => { setReply(m); input.current?.focus() }} onDelete={supprimer} />))}
      </div>

      {err && <p className="chat-error chat-error--bar">{err} <button type="button" onClick={() => setErr('')}>✕</button></p>}
      {reply && (
        <div className="chat-replybar">
          <div><b>{reply.auteur || 'Toi'}</b><span>{reply.texte}</span></div>
          <button type="button" onClick={() => setReply(null)} aria-label="Annuler la réponse">✕</button>
        </div>
      )}
      {emoji && (
        <div className="chat-emojis">
          {EMOJIS.map((e) => <button type="button" key={e} onClick={() => { setTexte((t) => t + e); input.current?.focus() }}>{e}</button>)}
        </div>
      )}
      <div className="chat-composer">
        <button type="button" className="chat-emoji-btn" onClick={() => setEmoji((v) => !v)} aria-label="Emojis">😊</button>
        <textarea
          ref={input}
          rows={1}
          value={texte}
          maxLength={2000}
          placeholder="Écris un message"
          onChange={(e) => { setTexte(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px` }}
          onKeyDown={onKey}
        />
        <button type="button" className="chat-send" onClick={envoyer} disabled={!texte.trim()} aria-label="Envoyer">➤</button>
      </div>

      {infos && <Participants room={room} conv={conv} token={token} members={members} me={me} chat={chat} onClose={() => setInfos(false)} />}
    </section>
  )
}

export default function ChatPanel({ chat, token, me, members }) {
  const [q, setQ] = useState('')
  const [nouveau, setNouveau] = useState(false)
  const { setPanelOpen } = chat

  useEffect(() => {
    setPanelOpen(true)
    return () => setPanelOpen(false)
  }, [setPanelOpen])

  const rooms = useMemo(() => {
    const t = q.trim().toLowerCase()
    return [...chat.rooms]
      .filter((r) => !t || (r.nom || '').toLowerCase().includes(t))
      // les messages privés vides n'apparaissent pas tant qu'on n'a pas écrit
      .filter((r) => r.kind !== 'dm' || r.last || r.id === chat.openId)
      .sort((a, b) => {
        const ta = a.last ? new Date(a.last.createdAt).getTime() : 0
        const tb = b.last ? new Date(b.last.createdAt).getTime() : 0
        return tb - ta || (a.nom || '').localeCompare(b.nom || '', 'fr')
      })
  }, [chat.rooms, chat.openId, q])

  const current = chat.rooms.find((r) => r.id === chat.openId)

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <span className="eyebrow">Entre adhérents</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Messagerie</h2>
      </div>
      <div className={`chat${current ? ' has-conv' : ''}`}>
        <aside className="chat-list">
          <div className="chat-list__head">
            <b>Discussions</b>
            <button type="button" className="chat-new" onClick={() => setNouveau(true)} title="Nouvelle discussion" aria-label="Nouvelle discussion">＋</button>
          </div>
          <input className="chat-search" placeholder="Rechercher une discussion" value={q} onChange={(e) => setQ(e.target.value)} />
          {!chat.online && <p className="chat-offline">Connexion perdue, reconnexion…</p>}
          <div className="chat-list__rows">
            {!chat.loaded && <p className="chat-empty">Chargement…</p>}
            {rooms.map((r) => (
              <button type="button" key={r.id} className={`chat-room${r.id === chat.openId ? ' is-on' : ''}`} onClick={() => chat.openRoom(r.id)}>
                <Avatar photoUrl={r.photoUrl} nom={r.nom} groupe={r.kind !== 'dm'} size={46} />
                <span className="chat-room__main">
                  <span className="chat-room__top"><b>{r.nom}</b>{r.last && <time>{heureListe(r.last.createdAt)}</time>}</span>
                  <span className="chat-room__bottom">
                    <span className="chat-room__last">
                      {r.last ? `${r.kind !== 'dm' && r.last.auteur ? `${r.last.auteur.split(' ')[0]} : ` : ''}${r.last.texte}` : (r.kind === 'dm' ? '' : `${r.members} participants`)}
                    </span>
                    {r.unread > 0 && <i className="chat-badge">{r.unread > 99 ? '99+' : r.unread}</i>}
                  </span>
                </span>
              </button>
            ))}
            {chat.loaded && rooms.length === 0 && <p className="chat-empty">Aucune discussion.</p>}
          </div>
        </aside>

        {current
          ? <Conversation key={current.id} chat={chat} room={current} token={token} me={me} members={members} onBack={() => chat.openRoom(null)} />
          : <section className="chat-conv chat-conv--vide"><p>Sélectionne une discussion<br />ou démarre-en une avec ＋</p></section>}
      </div>
      {nouveau && <NouvelleDiscussion chat={chat} token={token} me={me} members={members} onClose={() => setNouveau(false)} />}
    </div>
  )
}
