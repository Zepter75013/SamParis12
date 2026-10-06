// Moteur de l'aide en ligne : transforme les chapitres (fichiers Markdown du dossier chapitres/) en HTML.
// Ce module est volontairement « pur » (aucune API du navigateur, aucun import Vite) : il sert à la fois à l'application
// (aide interactive, impression) et au script de génération du PDF (scripts/aide-pdf.mjs, sous Node).
import { Marked } from 'marked'

export const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const echapper = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Fonctionnalités d'administration (même catalogue que l'écran « Rôles et droits »), pour afficher « Réservé aux rôles… ».
export const DROITS = {
  'membres.admin': 'Administrer les adhérents',
  'evenements.admin': 'Administrer les événements',
  'documents.upload': 'Ajouter des documents',
  'resultats.saisie': 'Saisir les résultats',
  'messagerie.salons': 'Créer des salons de discussion',
  'messagerie.moderer': 'Modérer la messagerie',
  'stats.effectifs': 'Statistiques : effectifs',
  'stats.courses': 'Statistiques : courses',
  'stats.engagement': 'Statistiques : engagement',
  'journal.voir': "Consulter le journal d'activité",
  'roles.admin': 'Gérer les rôles et les droits',
}

// Un chapitre est visible si son champ « droit » est vide ou si l'adhérent a au moins une des fonctionnalités listées (a|b|c).
export function droitOk(chapitre, can) {
  if (!chapitre.droit) return true
  return chapitre.droit.split('|').some((d) => can(d.trim()))
}

export function libelleDroits(droit) {
  return droit.split('|').map((d) => DROITS[d.trim()] || d.trim()).join(' ou ')
}

// En-tête « --- clé: valeur --- » d'un fichier de chapitre.
export function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) return { meta: {}, corps: raw }
  const meta = {}
  for (const ligne of m[1].split(/\r?\n/)) {
    const i = ligne.indexOf(':')
    if (i > 0) meta[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim()
  }
  return { meta, corps: m[2] }
}

const NOTES = {
  astuce: ['💡', 'Astuce'],
  attention: ['⚠️', 'Attention'],
  info: ['ℹ️', 'À savoir'],
  important: ['❗', 'Important'],
}

function creerMarked(prefixe, sections) {
  const md = new Marked({ gfm: true, breaks: false })
  md.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const html = this.parser.parseInline(tokens)
        if (depth === 2 || depth === 3) {
          const id = `${prefixe}-${slug(text)}`
          if (depth === 2) sections.push({ id, titre: text.replace(/[*_`]/g, '') })
          return `<h${depth} id="${id}">${html}</h${depth}>\n`
        }
        return `<h${depth}>${html}</h${depth}>\n`
      },
      link({ href, title, tokens }) {
        const texte = this.parser.parseInline(tokens)
        if (href.startsWith('ecran:')) return `<a href="#" class="aide-lien" data-ecran="${echapper(href.slice(6))}">${texte}</a>`
        if (href.startsWith('aide:')) return `<a href="#" class="aide-lien" data-chap="${echapper(href.slice(5))}">${texte}</a>`
        const t = title ? ` title="${echapper(title)}"` : ''
        return `<a href="${echapper(href)}"${t} target="_blank" rel="noopener noreferrer">${texte}</a>`
      },
    },
  })
  return md
}

const RE_BLOC = /^:::(\w+)[ \t]*(.*)\n([\s\S]*?)\n:::[ \t]*$/gm

// Rend le corps Markdown d'un chapitre. Blocs spéciaux (voir LISEZ-MOI.md) :
//   :::astuce / :::attention / :::info / :::important   encadré coloré (titre facultatif après le mot-clé)
//   :::faq Question ?                                    question à déplier
//   :::etapes                                            liste numérotée « pas à pas »
export function rendreCorps(corps, prefixe) {
  const sections = []
  const md = creerMarked(prefixe, sections)
  const blocs = []
  const texte = corps.replace(RE_BLOC, (_, type, titre, interieur) => {
    const html = md.parse(interieur.trim())
    let bloc
    if (NOTES[type]) {
      const [ico, defaut] = NOTES[type]
      bloc = `<aside class="aide-note aide-note--${type}"><div class="aide-note__titre"><span aria-hidden="true">${ico}</span> ${echapper(titre.trim() || defaut)}</div><div class="aide-note__corps">${html}</div></aside>`
    } else if (type === 'faq') {
      bloc = `<details class="aide-faq"><summary>${echapper(titre.trim())}</summary><div class="aide-faq__corps">${html}</div></details>`
    } else if (type === 'etapes') {
      bloc = `<div class="aide-etapes">${html}</div>`
    } else {
      bloc = html
    }
    blocs.push(bloc)
    return `\n§§BLOC${blocs.length - 1}§§\n`
  })
  let html = md.parse(texte)
  html = html.replace(/<p>§§BLOC(\d+)§§<\/p>/g, (_, i) => blocs[Number(i)])
  return { html, sections }
}

export function texteBrut(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Un fichier de chapitre (« 04-trombinoscope.md ») → objet chapitre.
export function parseChapitre(raw, fichier) {
  const { meta, corps } = parseFrontmatter(raw)
  const nom = fichier.replace(/^.*[\\/]/, '').replace(/\.md$/, '')
  const id = meta.id || slug(nom.replace(/^\d+(\.\d+)?-/, ''))
  const ordre = parseFloat(/^(\d+(?:\.\d+)?)-/.exec(nom)?.[1] ?? '999')
  const { html, sections } = rendreCorps(corps, id)
  return {
    id, ordre, html, sections,
    titre: meta.titre || id,
    icone: meta.icone || '',
    resume: meta.resume || '',
    ecran: meta.ecran || '',
    droit: meta.droit || '',
    maj: meta.maj || '',
    texte: texteBrut(html),
  }
}

// Chapitre « Quoi de neuf » construit automatiquement depuis l'historique des versions (src/version.js) :
// rien à écrire à la main, il se met à jour à chaque nouvelle version.
export function chapitreNouveautes(changelog) {
  const items = changelog.map((v) => `<li class="aide-nouveaute"><div class="aide-nouveaute__tete"><b>Version ${echapper(v.version)}</b> <span>${echapper(v.date)}</span></div><p>${echapper(v.notes)}</p></li>`).join('')
  const html = `<p>Les évolutions de l'espace adhérent, de la plus récente à la plus ancienne. Cette liste est mise à jour automatiquement à chaque nouvelle version.</p><ul class="aide-nouveautes">${items}</ul>`
  return {
    id: 'nouveautes', ordre: 9999, html, sections: [], titre: 'Quoi de neuf ?', icone: '🆕',
    resume: "Les nouveautés et les évolutions de l'espace adhérent.", ecran: '', droit: '', maj: '',
    texte: texteBrut(html),
  }
}
