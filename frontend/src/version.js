// Numéro de version du site (convention semver : MAJOR.MINOR.PATCH).
// Ajouter une entrée en haut de CHANGELOG à chaque changement notable et
// mettre à jour APP_VERSION en conséquence.
export const APP_VERSION = '1.19.1'

export const CHANGELOG = [
  {
    version: '1.19.1',
    date: '4 octobre 2026',
    notes: "Sur téléphone, la page ne déborde plus de l'écran : elle était deux fois trop large (et donc dézoomée) à cause du menu mobile rangé hors de l'écran. Toucher à côté du menu ouvert le referme désormais.",
  },
  {
    version: '1.19.0',
    date: '5 octobre 2026',
    notes: "Le secret du site s'enrichit : gels et gourdes à ramasser, oiseaux à éviter en se baissant, félicitations du club à 5 km et classement des adhérents (nécessite la migration 0017).",
  },
  {
    version: '1.18.0',
    date: '5 octobre 2026',
    notes: "Un petit secret s'est glissé sur le site : un mini-jeu avec le coureur de la SAM. À toi de le trouver !",
  },
  {
    version: '1.17.1',
    date: '5 octobre 2026',
    notes: "« 12e » s'écrit avec un e minuscule partout, y compris dans les titres en capitales. Bornes : 4 bandes rouges égales en haut et en bas, qui ne touchent plus « SAM PARIS 12 ».",
  },
  {
    version: '1.17.0',
    date: '5 octobre 2026',
    notes: "Le petit coureur est tiré au hasard à chaque visite : homme ou femme (queue-de-cheval), peau claire ou foncée, avec des cheveux assortis.",
  },
  {
    version: '1.16.4',
    date: '4 octobre 2026',
    notes: "Flamme du coureur : « 50 » avec « min » en dessous.",
  },
  {
    version: '1.16.3',
    date: '4 octobre 2026',
    notes: "La flamme du coureur prend la forme d'une voile de meneur d'allure (bord noir, haut arrondi) avec le chiffre 60 en vertical.",
  },
  {
    version: '1.16.2',
    date: '4 octobre 2026',
    notes: "Le petit coureur est plus grand et porte la flamme des meneurs d'allure (fanion SAM sur une hampe dans le dos). À chaque borne, il se range à côté pour ne pas la cacher.",
  },
  {
    version: '1.16.1',
    date: '4 octobre 2026',
    notes: "Bornes kilométriques un peu plus petites (58 px de large sur grand écran, 44 px sur mobile).",
  },
  {
    version: '1.16.0',
    date: '4 octobre 2026',
    notes: "Les bornes kilométriques reprennent le kakemono du club : bandes rouges en diagonale, « N Km » en grand, logo SAM et « SAM PARIS 12 ». Grisées par défaut, elles passent aux couleurs du club quand on arrive à leur hauteur.",
  },
  {
    version: '1.15.2',
    date: '3 octobre 2026',
    notes: "Le coureur arrive bien à la dernière borne quand on atteint le bas de la page.",
  },
  {
    version: '1.15.1',
    date: '3 octobre 2026',
    notes: "Le petit coureur porte désormais le vrai maillot de la SAM Paris 12 : blanc, rayures rouges horizontales sur le bas du torse, col et manches liserés de rouge, short noir.",
  },
  {
    version: '1.15.0',
    date: '3 octobre 2026',
    notes: "Un petit coureur en maillot SAM (blanc à rayures rouges) court de borne en borne quand on fait défiler l'accueil et les pages, en suivant la route sinueuse (écrans larges).",
  },
  {
    version: '1.14.6',
    date: '2 octobre 2026',
    notes: "Les photos des pages « Marche nordique » et « Notre terrain de jeu » sont inversées.",
  },
  {
    version: '1.14.5',
    date: '2 octobre 2026',
    notes: "Menu : les sous-menus s'ouvrent au clic et se referment dès qu'on choisit une page, qu'on clique à l'extérieur ou qu'on appuie sur Échap.",
  },
  {
    version: '1.14.4',
    date: '2 octobre 2026',
    notes: "Photos nettes en fond, sans flou ni miniature : la photo entière occupe le bandeau (accueil et pages), le texte se lit sur un dégradé à gauche. Sur mobile, la photo est en pleine largeur au-dessus du texte.",
  },
  {
    version: '1.14.3',
    date: '2 octobre 2026',
    notes: "Les photos redeviennent un fond : la photo, agrandie et floutée, couvre tout le bandeau (accueil et pages), avec la photo entière, non recadrée, au premier plan.",
  },
  {
    version: '1.14.2',
    date: '2 octobre 2026',
    notes: "Photos jamais tronquées : le diaporama de l'accueil affiche lui aussi la photo entière à côté du texte (au-dessus du texte sur mobile), comme les bandeaux des pages.",
  },
  {
    version: '1.14.1',
    date: '2 octobre 2026',
    notes: "Photos : les sous-menus passent de nouveau au-dessus des bandeaux photo (le bandeau héritait du style collant du menu) ; les photos ne sont plus tronquées : bandeaux de pages avec photo entière à côté du titre, photo entière au-dessus du texte sur mobile, recadrage de l'accueil réduit sur grand écran.",
  },
  {
    version: '1.14.0',
    date: '2 octobre 2026',
    notes: "Photos du club (reprises de la page d'accueil du site actuel) : diaporama en fondu enchaîné dans l'en-tête de l'accueil et bandeau photo en tête de chaque page de rubrique.",
  },
  {
    version: '1.13.1',
    date: '2 octobre 2026',
    notes: "Accueil et page Le club : effectifs réels du club (nombre d'adhérents, âges extrêmes, répartition par activité et par tranche d'âge) calculés à partir de la base via une API publique agrégée, à la place des chiffres du site actuel (686 adhérents, 16 à 84 ans) ; la pyramide des âges par genre est retirée faute de donnée de genre.",
  },
  {
    version: '1.13.0',
    date: '2 octobre 2026',
    notes: "Rubrique Compétition du site public alimentée par les données du club en base (et non plus par un instantané du site actuel) : Nos courses (courses à venir avec inscrits), Nos résultats (12 derniers mois, classés et meilleur classement) et Nos performances (records calculés), via de nouvelles API publiques sans donnée nominative. Nous y étions reste un contenu éditorial.",
  },
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
