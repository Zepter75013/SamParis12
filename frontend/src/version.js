// Numéro de version du site (convention semver : MAJOR.MINOR.PATCH).
// Ajouter une entrée en haut de CHANGELOG à chaque changement notable et
// mettre à jour APP_VERSION en conséquence.
export const APP_VERSION = '1.12.2'

export const CHANGELOG = [
  {
    version: '1.12.2',
    date: '2 octobre 2026',
    notes: "Le menu reprend exactement les bornes de l'accueil (même liste, même ordre, mêmes intitulés, numéro de km affiché dans les menus déroulants) : Le club (km 1 à 5), Adhésion (6), Compétition (7 à 10), Contact (11).",
  },
  {
    version: '1.12.1',
    date: '2 octobre 2026',
    notes: "Bornes en route sinueuse : une borne sur deux est décalée (accueil et pages de rubriques), reliées par des courbes pointillées, sur grand écran. Sur mobile, les bornes restent alignées.",
  },
  {
    version: '1.12.0',
    date: '2 octobre 2026',
    notes: "Les pages de chaque rubrique du menu reprennent le principe de l'accueil : un parcours de bornes kilométriques numérotées, une par section (chapitres de l'histoire, parcours du terrain de jeu, mois pour les courses et résultats, familles d'épreuves pour les records, années pour Nous y étions, etc.).",
  },
  {
    version: '1.11.0',
    date: '2 octobre 2026',
    notes: "Accueil refondu en 11 bornes kilométriques numérotées, une par rubrique du menu du site actuel (Qui sommes-nous, Histoire, Marche nordique, Horaires et lieux, Terrain de jeu, Adhésion, Nos courses, Nos résultats, Nos performances, Nous y étions, Contact), chacune avec un court texte et un lien vers sa page. Nouvelles pages Notre terrain de jeu, Adhésion, Contact et Nous y étions ; menu mis à jour.",
  },
  {
    version: '1.10.1',
    date: '2 octobre 2026',
    notes: "Accueil : le bloc « Qui sommes-nous » devient un court aperçu renvoyant vers les pages Le club et Histoire, pour éviter de répéter leur contenu.",
  },
  {
    version: '1.10.0',
    date: '2 octobre 2026',
    notes: "Site public mis à jour avec le contenu réel du site actuel du club : nouvelles pages Qui sommes-nous (conseil d'administration, entraîneurs, effectifs et pyramide des âges), Histoire du club, Horaires et lieux, Marche nordique, Nos courses, Nos résultats et Nos performances (records), menu déroulant, chiffres et horaires de l'accueil mis à jour (686 adhérents, séances du samedi, contact postal, séances d'essai).",
  },
  {
    version: '1.9.0',
    date: '2 octobre 2026',
    notes: "Email du code de vérification habillé aux couleurs du site (même style que l'email de bienvenue), au lieu d'un simple texte brut. Sur la page de connexion, les champs de nouveau mot de passe ne s'affichent plus qu'après vérification que le code saisi est correct — plus de formulaire de mot de passe affiché avant d'avoir un code valide.",
  },
  {
    version: '1.8.1',
    date: '2 octobre 2026',
    notes: "Nos Courses n'affiche plus les courses dont la date est passée — elles restent consultables dans l'onglet Résultats.",
  },
  {
    version: '1.8.0',
    date: '2 octobre 2026',
    notes: "Trombinoscope : la fiche d'un adhérent affiche maintenant ses 5 derniers résultats (date, épreuve, temps, classement), à la place du message de fonctionnalité de démonstration.",
  },
  {
    version: '1.7.1',
    date: '1er octobre 2026',
    notes: "Records du Club : la photo de l'adhérent s'affiche désormais à côté de son nom dans le tableau.",
  },
  {
    version: '1.7.0',
    date: '1er octobre 2026',
    notes: "Records du Club calculés automatiquement à partir des résultats déjà enregistrés (onglet Résultats) : meilleur temps par type de course et par genre, par catégorie FFA, et hit-parade des meilleures allures. Export Excel (CSV) fonctionnel pour la vue affichée. « Autres records » reste vide : aucune notion correspondante dans les données actuelles.",
  },
  {
    version: '1.6.1',
    date: '1er octobre 2026',
    notes: "Nouvel onglet « Records du Club » à côté de Résultats, avec les mêmes rubriques que le vrai site (Féminin, Masculin, Par type de course, Par catégorie, Hit-parade, Autres records, Télécharger Excel). Structure prête, en attente de l'import des données réelles.",
  },
  {
    version: '1.6.0',
    date: '1er octobre 2026',
    notes: "Tableau de bord : la carte « Ma prochaine course » affiche désormais la vraie prochaine course à laquelle l'adhérent est inscrit (date, lieu, distance, nombre d'inscrits), à la place du contenu de démonstration fixe.",
  },
  {
    version: '1.5.2',
    date: '1er octobre 2026',
    notes: "À propos : l'historique des versions se consulte maintenant via une liste déroulante (version la plus récente affichée par défaut) plutôt qu'une longue liste déroulée en entier.",
  },
  {
    version: '1.5.1',
    date: '1er octobre 2026',
    notes: "Correction d'un décalage de 2h sur les horodatages affichés (email envoyé, compte activé, expiration du code) : le serveur stocke en UTC, l'affichage ne convertissait pas vers l'heure locale du navigateur.",
  },
  {
    version: '1.5.0',
    date: '1er octobre 2026',
    notes: "Gestion des adhérents : bouton « Générer un code d'accès », qui crée un code de connexion et l'affiche directement au bureau (en plus d'une tentative d'envoi par email) — utile quand l'adhérent ne reçoit ni l'email de bienvenue ni le code (filtrage anti-spam chez son fournisseur). Sur la page de connexion, un lien « J'ai déjà un code » permet de le saisir sans redemander un nouveau code par email.",
  },
  {
    version: '1.4.0',
    date: '1er octobre 2026',
    notes: "Nouveau rôle SuperAdmin : seul-e à pouvoir modifier les fonctionnalités (droits accordés aux membres du bureau) depuis l'écran Fonctionnalités, qui devient invisible aux autres membres du bureau. Avoir is_bureau ne suffit plus pour y accéder.",
  },
  {
    version: '1.3.0',
    date: '1er octobre 2026',
    notes: "Résultats : correction du droit « Saisir les résultats », qui s'appliquait à tort automatiquement aux membres du bureau (il doit désormais être activé individuellement, même pour le bureau). Cliquer sur la photo d'un coureur affiche maintenant ses prochaines courses et ses 5 derniers résultats (avec un lien pour tout voir) plutôt que sa fiche profil. Le libellé « Résultats & Records » est aussi corrigé dans le menu.",
  },
  {
    version: '1.2.1',
    date: '1er octobre 2026',
    notes: "Nos Courses et Résultats : ajout de filtres (recherche par titre/lieu, type de course, et année pour Résultats). La rubrique « Résultats & Records du Club » est renommée simplement « Résultats ».",
  },
  {
    version: '1.2.0',
    date: '1er octobre 2026',
    notes: "Résultats & Records devient une vraie fonctionnalité : liste des courses passées, saisie manuelle des résultats (temps, classement général et par catégorie) réservée au bureau ou aux adhérents disposant du nouveau droit « Saisir les résultats », allure calculée automatiquement à partir de la distance et du temps.",
  },
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
