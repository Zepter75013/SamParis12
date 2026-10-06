// Jour d'anniversaire déduit du champ libre « Je suis né » des informations visibles (même règles que le serveur,
// backend/internal/member/anniversaire.go) : « 23 juillet 1967 », « 23/07/1967 », « 1er janvier »… L'année est facultative.

const MOIS = [['janv', 1], ['fev', 2], ['mar', 3], ['avr', 4], ['mai', 5], ['juin', 6], ['juil', 7], ['aou', 8], ['sep', 9], ['oct', 10], ['nov', 11], ['dec', 12]]
const NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const sansAccent = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const numeroMois = (mot) => (MOIS.find(([p]) => mot.startsWith(p)) || [0, 0])[1]

// → { jour, mois } ou null si la date n'est pas reconnue
export function jourAnniversaire(texte) {
  const t = sansAccent(String(texte || '').trim())
  if (!t) return null
  let jour = 0
  let mois = 0
  const iso = /(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})/.exec(t)
  if (iso) {
    mois = Number(iso[2])
    jour = Number(iso[3])
  } else {
    for (const m of t.matchAll(/(?:^|\D)(\d{1,2})\s*(?:er)?\s*(?:de\s+)?([a-z]{3,})/g)) {
      const n = numeroMois(m[2])
      if (n) { jour = Number(m[1]); mois = n; break }
    }
    if (!mois) {
      const num = /(?:^|\D)(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*\d{2,4})?(?:\D|$)/.exec(t)
      if (num) { jour = Number(num[1]); mois = Number(num[2]) }
    }
  }
  if (mois < 1 || mois > 12 || jour < 1) return null
  if (jour > new Date(2024, mois, 0).getDate()) return null // 29 février accepté
  return { jour, mois }
}

export const libelleJour = ({ jour, mois }) => `${jour === 1 ? '1er' : jour} ${NOMS[mois - 1]}`

// Aujourd'hui est-il l'anniversaire indiqué dans ce texte ? (sert à actualiser la liste après une modification du profil)
export function estAnniversaireAujourdhui(texte) {
  const j = jourAnniversaire(texte)
  if (!j) return false
  const n = new Date()
  return j.jour === n.getDate() && j.mois === n.getMonth() + 1
}
