// Chargement des chapitres de l'aide : tous les fichiers de chapitres/*.md sont intégrés au site à la compilation.
// Pour ajouter ou modifier un chapitre : voir LISEZ-MOI.md (dans ce dossier).
import { CHANGELOG, APP_VERSION } from '../version.js'
import { parseChapitre, chapitreNouveautes } from './render.js'

const fichiers = import.meta.glob('./chapitres/*.md', { query: '?raw', import: 'default', eager: true })

export const CHAPITRES = [
  ...Object.entries(fichiers).map(([chemin, brut]) => parseChapitre(brut, chemin)).sort((a, b) => a.ordre - b.ordre),
  chapitreNouveautes(CHANGELOG),
]

export { APP_VERSION }
