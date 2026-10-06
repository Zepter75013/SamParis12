// Document imprimable (couverture, sommaire, chapitres) : mêmes chapitres que l'aide en ligne, mise en page A4.
// Utilisé par l'impression depuis l'application (AidePanel) et par le script de génération du PDF (scripts/aide-pdf.mjs).
import { echapper, libelleDroits } from './render.js'

// sansCouverture : un seul chapitre à imprimer, sans page de garde ni sommaire.
export function construireDocument(chapitres, { titre, sousTitre, version, date, sansCouverture = false }) {
  const sommaire = chapitres
    .map((c) => `<li><a href="#doc-${c.id}"><span class="aide-som__ico">${c.icone}</span><span class="aide-som__titre">${echapper(c.titre)}</span></a>${c.resume ? `<small>${echapper(c.resume)}</small>` : ''}</li>`)
    .join('')
  const couverture = `<section class="aide-couv"><div class="aide-couv__bandeau">SAM Paris 12</div><h1>${echapper(titre)}</h1><p class="aide-couv__sous">${echapper(sousTitre)}</p><p class="aide-couv__version">Version ${echapper(version)} · ${echapper(date)}</p></section>`
  const toc = `<section class="aide-som"><h1>Sommaire</h1><ol>${sommaire}</ol></section>`
  const corps = chapitres
    .map((c) => {
      const droit = c.droit ? `<p class="aide-chap__droit">Chapitre réservé aux rôles disposant de la fonctionnalité : ${echapper(libelleDroits(c.droit))}.</p>` : ''
      // Les questions de la FAQ sont dépliées sur le papier.
      const html = c.html.replace(/<details /g, '<details open ')
      return `<section class="aide-chap" id="doc-${c.id}"><header class="aide-chap__tete"><span class="aide-chap__ico">${c.icone}</span><h1>${echapper(c.titre)}</h1></header>${droit}${html}</section>`
    })
    .join('')
  return sansCouverture ? corps : couverture + toc + corps
}
