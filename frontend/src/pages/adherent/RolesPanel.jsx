import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

// Écran « Rôles et droits », sur le modèle de la personnalisation du ruban d'Excel : on choisit un rôle en haut ;
// à gauche les fonctionnalités disponibles, à droite celles accordées à ce rôle ; les boutons au centre les déplacent.
// Le rôle « Adhérent » est le plus simple : aucune fonctionnalité d'administration.

const ICONES = {
  'membres.admin': '👥',
  'evenements.admin': '📅',
  'documents.upload': '📄',
  'resultats.saisie': '🏁',
  'messagerie.salons': '💬',
  'messagerie.moderer': '🛡️',
  'roles.admin': '🔑',
}

const TYPE_GLISSER = 'application/x-sam-fonctionnalites'

// Liste de fonctionnalités : clic = sélection, Cmd/Ctrl + clic = ajouter ou retirer, Shift + clic = plage, double-clic = déplacer,
// glisser-déposer vers l'autre liste (plusieurs éléments à la fois si plusieurs sont sélectionnés).
function Liste({ titre, zone, items, selection, setSelection, onMove, onDropCodes, disabled, vide }) {
  const ancre = useRef(null)
  const [dessus, setDessus] = useState(false)

  function cliquer(e, code, index) {
    // mises à jour fonctionnelles : plusieurs clics très rapprochés ne s'écrasent pas
    if (e.shiftKey && ancre.current) {
      const a = items.findIndex((f) => f.code === ancre.current)
      const debut = Math.min(a < 0 ? index : a, index)
      const fin = Math.max(a < 0 ? index : a, index)
      const plage = items.slice(debut, fin + 1).map((f) => f.code)
      setSelection((cur) => (e.metaKey || e.ctrlKey ? [...new Set([...cur, ...plage])] : plage))
      return
    }
    ancre.current = code
    if (e.metaKey || e.ctrlKey) setSelection((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]))
    else setSelection((cur) => (cur.length === 1 && cur[0] === code ? [] : [code]))
  }

  function glisser(e, code) {
    if (disabled) { e.preventDefault(); return }
    const codes = selection.includes(code) ? selection : [code]
    if (!selection.includes(code)) setSelection([code])
    e.dataTransfer.setData(TYPE_GLISSER, JSON.stringify({ zone, codes }))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="roles-col">
      <b className="roles-col__titre">{titre}</b>
      <div
        className={`roles-liste${dessus ? ' is-over' : ''}`}
        role="listbox"
        aria-multiselectable="true"
        aria-label={titre}
        onDragOver={(e) => { if (!disabled && e.dataTransfer.types.includes(TYPE_GLISSER)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDessus(true) } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDessus(false) }}
        onDrop={(e) => {
          setDessus(false)
          const raw = e.dataTransfer.getData(TYPE_GLISSER)
          if (!raw || disabled) return
          e.preventDefault()
          try {
            const d = JSON.parse(raw)
            if (d.zone !== zone) onDropCodes(d.codes)
          } catch { /* glisser-déposer étranger à l'écran */ }
        }}
      >
        {items.map((f, i) => (
          <div
            key={f.code}
            role="option"
            aria-selected={selection.includes(f.code)}
            tabIndex={0}
            draggable={!disabled}
            className={`roles-item${selection.includes(f.code) ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
            title={f.description}
            onClick={(e) => cliquer(e, f.code, i)}
            onDoubleClick={() => !disabled && onMove(selection.includes(f.code) ? selection : [f.code])}
            onDragStart={(e) => glisser(e, f.code)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); !disabled && onMove(selection.length ? selection : [f.code]) }
              if (e.key === ' ') { e.preventDefault(); setSelection(selection.includes(f.code) ? selection.filter((c) => c !== f.code) : [...selection, f.code]) }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelection(items.map((x) => x.code)) }
            }}
          >
            <span className="roles-item__ico">{ICONES[f.code] || '⚙️'}</span>
            <span className="roles-item__txt"><b>{f.label}</b><small>{f.description}</small></span>
          </div>
        ))}
        {items.length === 0 && <p className="roles-liste__vide">{vide}</p>}
      </div>
    </div>
  )
}

export default function RolesPanel({ token }) {
  const [roles, setRoles] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [roleId, setRoleId] = useState(null)
  const [draft, setDraft] = useState(null) // { nom, description, estBureau, features }
  const [selGauche, setSelGauche] = useState([])
  const [selDroite, setSelDroite] = useState([])
  const [saving, setSaving] = useState(false)
  const [nouveau, setNouveau] = useState(false)
  const [nomNouveau, setNomNouveau] = useState('')

  const role = useMemo(() => roles.find((r) => r.id === roleId) || null, [roles, roleId])
  const verrouille = !!role && (role.systeme) // Adhérent et Super administrateur : fonctionnalités non modifiables

  const choisir = useCallback((r) => {
    setRoleId(r.id)
    setDraft({ nom: r.nom, description: r.description, estBureau: r.estBureau, features: [...r.features] })
    setSelGauche([])
    setSelDroite([])
    setMessage('')
  }, [])

  const charger = useCallback(async (reste) => {
    setErreur('')
    try {
      const data = await api.getRoles(token)
      setRoles(data.roles)
      setCatalogue(data.features)
      setCanEdit(data.canEdit)
      const cible = data.roles.find((r) => r.id === reste) || data.roles[0]
      if (cible) choisir(cible)
    } catch (e) {
      setErreur(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, choisir])

  useEffect(() => { charger(null) }, [charger])

  const modifie = !!role && !!draft && (
    draft.nom !== role.nom || draft.description !== role.description || draft.estBureau !== role.estBureau
    || draft.features.slice().sort().join() !== role.features.slice().sort().join()
  )

  function changerRole(id) {
    if (modifie && !window.confirm('Des modifications ne sont pas enregistrées. Les abandonner ?')) return
    const r = roles.find((x) => x.id === Number(id))
    if (r) choisir(r)
  }

  const disponibles = catalogue.filter((f) => draft && !draft.features.includes(f.code))
  const accordees = catalogue.filter((f) => draft && draft.features.includes(f.code))

  const deplacer = (codes, vers) => {
    if (!codes.length || verrouille || !canEdit) return
    setDraft((d) => ({ ...d, features: vers === 'droite' ? [...new Set([...d.features, ...codes])] : d.features.filter((f) => !codes.includes(f)) }))
    setSelGauche([])
    setSelDroite([])
    setMessage('')
  }

  async function enregistrer() {
    setSaving(true)
    setErreur('')
    setMessage('')
    try {
      await api.updateRole(token, role.id, draft)
      await charger(role.id)
      setMessage('Modifications enregistrées.')
    } catch (e) {
      setErreur(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function creer() {
    setSaving(true)
    setErreur('')
    try {
      const r = await api.createRole(token, { nom: nomNouveau, description: '', estBureau: false })
      setNouveau(false)
      setNomNouveau('')
      await charger(r.id)
      setMessage('Rôle créé : choisis maintenant ses fonctionnalités.')
    } catch (e) {
      setErreur(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function supprimer() {
    if (role.membres > 0) return
    if (!window.confirm(`Supprimer le rôle « ${role.nom} » ?`)) return
    setSaving(true)
    setErreur('')
    try {
      await api.deleteRole(token, role.id)
      await charger(null)
      setMessage('Rôle supprimé.')
    } catch (e) {
      setErreur(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--stone)' }}>Chargement…</p>

  return (
    <div className="roles">
      <div style={{ marginBottom: '1.2rem' }}>
        <span className="eyebrow">Réservé aux administrateurs des rôles</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Rôles et droits</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Choisis un rôle, puis déplace à droite les fonctionnalités d'administration qu'il doit avoir. Chaque adhérent a un rôle (à régler dans sa fiche, Admin Club) :
          le rôle Adhérent, le plus simple, n'a aucune fonctionnalité d'administration.
        </p>
      </div>

      {erreur && <p className="roles-erreur">{erreur}</p>}

      {role && draft && (
        <>
          <div className="roles-barre">
            <label>
              <span>Rôle</span>
              <select className="roles-select" value={roleId} onChange={(e) => changerRole(e.target.value)}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nom} ({r.membres})</option>)}
              </select>
            </label>
            {canEdit && !nouveau && <button type="button" className="btn btn--ghost roles-btn" onClick={() => setNouveau(true)}>＋ Nouveau rôle</button>}
            {canEdit && !role.systeme && (
              <button
                type="button"
                className="btn btn--ghost roles-btn roles-btn--danger"
                onClick={supprimer}
                disabled={saving || role.membres > 0}
                title={role.membres > 0 ? 'Ce rôle est encore attribué : change d’abord le rôle de ses adhérents.' : 'Supprimer ce rôle'}
              >
                Supprimer ce rôle
              </button>
            )}
          </div>

          {nouveau && (
            <div className="roles-nouveau">
              <input className="roles-input" placeholder="Nom du nouveau rôle (ex. Entraîneur)" value={nomNouveau} maxLength={60} autoFocus onChange={(e) => setNomNouveau(e.target.value)} />
              <button type="button" className="btn btn--solid roles-btn" disabled={saving || !nomNouveau.trim()} onClick={creer}>Créer</button>
              <button type="button" className="btn btn--ghost roles-btn" onClick={() => { setNouveau(false); setNomNouveau('') }}>Annuler</button>
            </div>
          )}

          <div className="roles-fiche">
            <label>Nom du rôle
              <input className="roles-input" value={draft.nom} maxLength={60} disabled={role.systeme || !canEdit} onChange={(e) => setDraft((d) => ({ ...d, nom: e.target.value }))} />
            </label>
            <label>Description
              <input className="roles-input" value={draft.description} maxLength={255} disabled={!canEdit} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </label>
            <label className="roles-check">
              <input type="checkbox" checked={draft.estBureau} disabled={role.systeme || !canEdit} onChange={(e) => setDraft((d) => ({ ...d, estBureau: e.target.checked }))} />
              Les adhérents de ce rôle font partie du bureau (salon Bureau, badge)
            </label>
            <small>
              {role.membres} adhérent{role.membres > 1 ? 's ont' : ' a'} ce rôle{role.nomsMembres?.length ? ` : ${role.nomsMembres.join(', ')}${role.membres > role.nomsMembres.length ? '…' : ''}` : ''}.
              {!role.systeme && role.membres > 0 && ' Pour supprimer ce rôle, change d’abord celui de ces adhérents (fiche adhérent, Admin Club).'}
            </small>
          </div>

          {role.estSuper && <p className="roles-info">Ce rôle a <b>toutes les fonctionnalités</b>, y compris celles qui seront ajoutées plus tard. Il ne peut pas être modifié.</p>}
          {role.systeme && !role.estSuper && <p className="roles-info">Le rôle <b>Adhérent</b> est le plus simple : <b>aucune fonctionnalité d'administration</b>. Il ne peut pas en recevoir.</p>}
          {!canEdit && <p className="roles-info">Tu peux consulter les rôles, mais seul un administrateur des rôles peut les modifier.</p>}

          <div className="roles-transfert">
            <Liste
              titre="Fonctionnalités disponibles"
              zone="gauche"
              items={disponibles}
              selection={selGauche}
              setSelection={setSelGauche}
              onMove={(c) => deplacer(c, 'droite')}
              onDropCodes={(c) => deplacer(c, 'gauche')}
              disabled={verrouille || !canEdit}
              vide={role.estSuper ? 'Toutes les fonctionnalités sont accordées.' : 'Toutes les fonctionnalités sont déjà accordées à ce rôle.'}
            />
            <div className="roles-boutons">
              <button type="button" onClick={() => deplacer(selGauche, 'droite')} disabled={verrouille || !canEdit || selGauche.length === 0} aria-label="Accorder les fonctionnalités sélectionnées" title="Accorder">›</button>
              <button type="button" onClick={() => deplacer(selDroite, 'gauche')} disabled={verrouille || !canEdit || selDroite.length === 0} aria-label="Retirer les fonctionnalités sélectionnées" title="Retirer">‹</button>
              <button type="button" className="roles-boutons__tout" onClick={() => deplacer(disponibles.map((f) => f.code), 'droite')} disabled={verrouille || !canEdit || disponibles.length === 0} aria-label="Tout accorder" title="Tout accorder">»</button>
              <button type="button" className="roles-boutons__tout" onClick={() => deplacer(accordees.map((f) => f.code), 'gauche')} disabled={verrouille || !canEdit || accordees.length === 0} aria-label="Tout retirer" title="Tout retirer">«</button>
            </div>
            <Liste
              titre={`Fonctionnalités accordées au rôle « ${draft.nom || role.nom} »`}
              zone="droite"
              items={accordees}
              selection={selDroite}
              setSelection={setSelDroite}
              onMove={(c) => deplacer(c, 'gauche')}
              onDropCodes={(c) => deplacer(c, 'droite')}
              disabled={verrouille || !canEdit}
              vide="Aucune fonctionnalité d'administration : un simple adhérent."
            />
          </div>
          <p className="roles-aide">Clique pour sélectionner une fonctionnalité, Cmd ou Ctrl + clic pour en ajouter ou en retirer une, Shift + clic pour en choisir plusieurs d'un coup. Glisse-les d'une liste à l'autre, ou utilise les boutons au centre ; un double-clic déplace directement.</p>

          {canEdit && (
            <div className="roles-pied">
              {message && <span className="roles-ok">{message}</span>}
              <button type="button" className="btn btn--ghost roles-btn" onClick={() => choisir(role)} disabled={!modifie || saving}>Annuler</button>
              <button type="button" className="btn btn--solid roles-btn" onClick={enregistrer} disabled={!modifie || saving || !draft.nom.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
