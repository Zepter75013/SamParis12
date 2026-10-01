// Numéro de version du site (convention semver : MAJOR.MINOR.PATCH).
// Ajouter une entrée en haut de CHANGELOG à chaque changement notable et
// mettre à jour APP_VERSION en conséquence.
export const APP_VERSION = '1.1.0'

export const CHANGELOG = [
  {
    version: '1.1.0',
    date: '1er octobre 2026',
    notes: "Email de bienvenue envoyé par le bureau à la création d'un adhérent (choix d'envoyer tout de suite ou plus tard, aux couleurs du site), avec suivi dans le tableau de gestion des adhérents : date d'envoi et date d'activation du compte par l'adhérent.",
  },
  {
    version: '1.0.1',
    date: '30 septembre 2026',
    notes: "Nos Courses : règles de cohérence entre participation, recherche et cession de dossard (par ex. céder son dossard bloque une nouvelle inscription ou une recherche tant que la cession n'a pas été annulée).",
  },
  {
    version: '1.0.0',
    date: '30 septembre 2026',
    notes: "Première version stable de l'espace adhérent réel : authentification par email/mot de passe, gestion des adhérents par le bureau, trombinoscope, Nos Courses (inscription, recherche et cession de dossard), Plans & Documents, écran Fonctionnalités du bureau et préférence de thème.",
  },
]
