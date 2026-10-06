// Disposition du menu de l'espace adhérent : 'horizontal' (onglets en haut) ou 'lateral' (menu à gauche).
// Le choix est enregistré sur le profil de l'adhérent (il le suit d'un appareil à l'autre) ; une copie locale évite
// de voir l'ancienne disposition clignoter au chargement.
const KEY = 'samparis12_menu'

export const valide = (v) => (v === 'lateral' ? 'lateral' : 'horizontal')

export function getMenuLayout() {
  try {
    return valide(localStorage.getItem(KEY))
  } catch {
    return 'horizontal'
  }
}

export function cacheMenuLayout(v) {
  try {
    localStorage.setItem(KEY, valide(v))
  } catch {
    // stockage indisponible : la disposition reste appliquée pour la session en cours
  }
}
