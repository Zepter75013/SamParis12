import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CHAPITRES, APP_VERSION } from '../../aide/index.js'
import { droitOk, libelleDroits, texteBrut } from '../../aide/render.js'
import { construireDocument } from '../../aide/document.js'
import '../../aide/aide.css'

// Aide en ligne de l'espace adhérent : chapitres, recherche, liens vers les écrans, impression / PDF.
// Le contenu vient des fichiers src/aide/chapitres/*.md (voir src/aide/LISEZ-MOI.md pour les mettre à jour).

// Sans accents ni majuscules, pour la recherche.
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Petits mots ignorés par la recherche (« mot de passe » cherche surtout « mot » et « passe »).
const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'au', 'aux', 'ou', 'sur', 'pour', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'je', 'tu', 'il', 'se', 'ce', 'ca', 'que', 'qui'])

const VARIANTES = { a: 'aàâä', e: 'eéèêë', i: 'iîï', o: 'oôö', u: 'uùûü', c: 'cç', y: 'yÿ' }

// Motif de surlignage insensible aux accents et à la casse.
function motif(termes) {
  const un = (t) => [...t].map((c) => (VARIANTES[c] ? `[${VARIANTES[c]}]` : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')
  return new RegExp(`(?<![\\p{L}])(?:${termes.map(un).join('|')})`, 'giu')
}

function surligner(html, termes) {
  if (!termes.length) return html
  const re = motif(termes)
  return html
    .split(/(<[^>]+>|&[a-z]+;|&#\d+;)/i)
    .map((p) => (p.startsWith('<') || p.startsWith('&') ? p : p.replace(re, (m) => `<mark>${m}</mark>`)))
    .join('')
}

// Découpe un chapitre en sections (une par titre de niveau 2) pour que la recherche renvoie directement à la bonne partie.
function sectionsDe(ch) {
  return ch.html.split(/(?=<h2 id=")/).map((morceau) => {
    const id = /^<h2 id="([^"]+)"/.exec(morceau)?.[1] || ''
    const titre = id ? ch.sections.find((s) => s.id === id)?.titre || '' : ''
    return { id, titre, texte: texteBrut(morceau) }
  })
}

const aujourdhui = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function AidePanel({ features, cible, onEcran }) {
  // Les chapitres visibles ne dépendent que des fonctionnalités du rôle : clé stable, pas de recalcul à chaque rendu du tableau de bord.
  const cle = (features || []).join('|')
  const visibles = useMemo(() => CHAPITRES.filter((c) => droitOk(c, (f) => cle.split('|').includes(f))), [cle])
  const index = useMemo(() => visibles.map((c) => ({ ch: c, parts: sectionsDe(c).map((p) => ({ ...p, norm: norm(`${c.titre} ${p.titre} ${p.texte}`) })) })), [visibles])

  const [chapId, setChapId] = useState(visibles[0]?.id)
  const [q, setQ] = useState('')
  const [voirResultats, setVoirResultats] = useState(false)
  const [impr, setImpr] = useState(null) // null | 'chapitre' | 'tout'
  const principal = useRef(null)
  const aAncre = useRef('')

  const courant = visibles.find((c) => c.id === chapId) || visibles[0]
  const termes = useMemo(() => {
    const tous = norm(q).split(/\s+/).filter((t) => t.length >= 2)
    const utiles = tous.filter((t) => !MOTS_VIDES.has(t))
    return utiles.length ? utiles : tous
  }, [q])
  const recherche = termes.length > 0

  // Aide contextuelle : le bouton « ? » du haut de l'écran ouvre le chapitre de l'écran où l'on se trouve.
  useEffect(() => {
    if (!cible) return
    const ch = visibles.find((c) => c.ecran === cible.id)
    if (ch) { setChapId(ch.id); setQ(''); setVoirResultats(false) }
  }, [cible, visibles])

  const resultats = useMemo(() => {
    if (!recherche) return []
    const out = []
    for (const { ch, parts } of index) {
      for (const p of parts) {
        if (!termes.every((t) => p.norm.includes(t))) continue
        const brut = p.texte
        const pos = norm(brut).indexOf(termes[0])
        const debut = Math.max(0, pos - 60)
        const extrait = (debut > 0 ? '… ' : '') + brut.slice(debut, debut + 200) + (debut + 200 < brut.length ? ' …' : '')
        const dansTitre = norm(`${ch.titre} ${p.titre}`).includes(termes[0])
        out.push({ ch, id: p.id, titre: p.titre, extrait, score: dansTitre ? 0 : 1 })
      }
    }
    return out.sort((a, b) => a.score - b.score).slice(0, 40)
  }, [index, termes, recherche])

  useEffect(() => { setVoirResultats(recherche) }, [recherche])

  function ouvrir(id, ancre = '') {
    if (!visibles.some((c) => c.id === id)) return
    aAncre.current = ancre
    setChapId(id)
    setVoirResultats(false)
  }

  // Après changement de chapitre : on remonte en haut du chapitre, ou on va à la section demandée.
  useEffect(() => {
    const t = setTimeout(() => {
      const cible = aAncre.current && document.getElementById(aAncre.current)
      aAncre.current = ''
      if (cible) cible.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else principal.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 30)
    return () => clearTimeout(t)
  }, [chapId, voirResultats])

  function surClicContenu(e) {
    const a = e.target.closest('a.aide-lien')
    if (!a) return
    e.preventDefault()
    if (a.dataset.ecran) onEcran(a.dataset.ecran)
    else if (a.dataset.chap) ouvrir(a.dataset.chap)
  }

  // Impression / enregistrement en PDF : le document est monté hors de l'application (portail) et seul lui est imprimé.
  useEffect(() => {
    if (!impr) return undefined
    const fin = () => setImpr(null)
    window.addEventListener('afterprint', fin, { once: true })
    const t = setTimeout(() => window.print(), 200)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fin) }
  }, [impr])

  if (!courant) return <p style={{ color: 'var(--stone)' }}>Aucun chapitre d'aide disponible.</p>

  const pos = visibles.indexOf(courant)
  const precedent = visibles[pos - 1]
  const suivant = visibles[pos + 1]
  const htmlChapitre = surligner(courant.html, termes)
  const docHtml = impr
    ? construireDocument(impr === 'tout' ? visibles : [courant], {
      titre: "Aide de l'espace adhérent", sousTitre: "Club d'athlétisme SAM Paris 12", version: APP_VERSION, date: aujourdhui(), sansCouverture: impr === 'chapitre',
    })
    : ''

  return (
    <div className="aide">
      <div className="aide-entete">
        <span className="eyebrow">Mode d'emploi</span>
        <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', marginTop: '0.2rem' }}>Aide</h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>
          Tout savoir pour utiliser l'espace adhérent : cherche un mot, choisis un chapitre ou clique sur le bouton <b>?</b> en haut de n'importe quel écran pour obtenir l'aide qui lui correspond.
        </p>
      </div>

      <div className="aide-grille">
        <nav className="aide-nav" aria-label="Chapitres de l'aide">
          <div className="aide-recherche">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans l'aide…" aria-label="Rechercher dans l'aide" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Effacer la recherche">✕</button>}
          </div>
          <ol>
            {visibles.map((c) => (
              <li key={c.id}>
                <button type="button" aria-current={!voirResultats && c.id === courant.id ? 'true' : undefined} onClick={() => ouvrir(c.id)}>
                  <span className="aide-nav__ico" aria-hidden="true">{c.icone}</span>
                  <span>{c.titre}</span>
                  {c.droit && <span className="aide-nav__cadenas" title="Réservé à certains rôles" aria-hidden="true">🔒</span>}
                </button>
              </li>
            ))}
          </ol>
          <p className="aide-version">Aide à jour de la version {APP_VERSION}.</p>
        </nav>

        <article className="aide-main" ref={principal}>
          {voirResultats ? (
            <>
              <h3 className="aide-titre" style={{ font: '700 1.6rem var(--font-display)', textTransform: 'uppercase' }}>
                {resultats.length} résultat{resultats.length > 1 ? 's' : ''} pour « {q.trim()} »
              </h3>
              {resultats.length === 0 ? (
                <p style={{ color: 'var(--stone)' }}>Aucun résultat. Essaie un autre mot, ou parcours les chapitres dans la liste.</p>
              ) : (
                <ul className="aide-resultats">
                  {resultats.map((r) => (
                    <li key={`${r.ch.id}-${r.id}`}>
                      <button type="button" className="aide-resultat" onClick={() => ouvrir(r.ch.id, r.id)}>
                        <b>{r.ch.icone} {r.ch.titre}</b>
                        {r.titre && <small>{r.titre}</small>}
                        <span dangerouslySetInnerHTML={{ __html: surligner(r.extrait.replace(/&/g, '&amp;').replace(/</g, '&lt;'), termes) }} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <header className="aide-chap-tete">
                <div>
                  <h3 className="aide-titre">{courant.icone} {courant.titre}</h3>
                  {courant.resume && <p>{courant.resume}</p>}
                  {courant.droit && <span className="aide-badge-droit">Réservé : {libelleDroits(courant.droit)}</span>}
                  {recherche && <p style={{ marginTop: '0.5rem' }}><button type="button" className="link-button" onClick={() => setVoirResultats(true)}>← Retour aux résultats de la recherche</button></p>}
                </div>
                <div className="aide-actions">
                  {courant.ecran && (
                    <button type="button" className="btn btn--solid" style={{ padding: '0.55rem 1rem', fontSize: '0.72rem' }} onClick={() => onEcran(courant.ecran)}>Ouvrir cet écran →</button>
                  )}
                  <button type="button" className="btn btn--ghost" style={{ padding: '0.55rem 1rem', fontSize: '0.72rem' }} onClick={() => setImpr('chapitre')}>Imprimer ce chapitre</button>
                  <button type="button" className="btn btn--ghost" style={{ padding: '0.55rem 1rem', fontSize: '0.72rem' }} onClick={() => setImpr('tout')}>Manuel complet (PDF)</button>
                </div>
              </header>

              {courant.sections.length > 1 && (
                <div className="aide-puces">
                  <span>Sur cette page</span>
                  {courant.sections.map((s) => (
                    <button key={s.id} type="button" onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{s.titre}</button>
                  ))}
                </div>
              )}

              <div className="aide-contenu" onClick={surClicContenu} dangerouslySetInnerHTML={{ __html: htmlChapitre }} />

              <div className="aide-pied">
                {precedent ? <button type="button" className="btn btn--ghost" onClick={() => ouvrir(precedent.id)}>← {precedent.titre}</button> : <span />}
                {suivant ? <button type="button" className="btn btn--ghost" onClick={() => ouvrir(suivant.id)}>{suivant.titre} →</button> : <span />}
              </div>
            </>
          )}
        </article>
      </div>

      {impr && createPortal(
        <div className="aide-printroot"><div className={`aide-doc${impr === 'chapitre' ? ' aide-doc--chapitre' : ''}`} dangerouslySetInnerHTML={{ __html: docHtml }} /></div>,
        document.body,
      )}
    </div>
  )
}
