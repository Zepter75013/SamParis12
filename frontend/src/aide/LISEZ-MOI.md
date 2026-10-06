# Aide en ligne de l'espace adhérent — mode d'emploi pour la mettre à jour

L'aide (écran **Aide** du menu, bouton **?** en haut de chaque écran, export PDF) est entièrement générée à partir
des fichiers Markdown du dossier `chapitres/`. **Modifier un fichier suffit** : l'aide en ligne et le PDF se mettent à jour.

## Mettre à jour un chapitre

1. Ouvrir le fichier du chapitre, par exemple `chapitres/04-trombinoscope.md`, et modifier le texte.
2. Vérifier le résultat en local : `npm run dev`, puis menu **Aide**.
3. Mettre à jour la version dans `src/version.js` (une ligne dans `CHANGELOG`, comme pour toute évolution), puis déployer
   comme d'habitude (rsync + `docker compose up -d --build`). Le chapitre « Quoi de neuf ? » se remplit tout seul depuis le CHANGELOG.
4. Facultatif — régénérer le PDF partageable : `npm run aide:pdf` (voir plus bas).

## Ajouter un chapitre

Créer un fichier `chapitres/NN-nom.md` (le nombre `NN` donne l'ordre dans le menu : 05, 12, 20…). Il apparaît tout seul.
Le fichier commence par un en-tête :

```
---
titre: Nom affiché dans le menu
icone: 🏃
resume: Une phrase qui décrit le chapitre (liste de l'aide et sommaire du PDF).
ecran: courses
droit: resultats.saisie
---
```

| Champ | Rôle |
|---|---|
| `titre` | Titre du chapitre (obligatoire). |
| `icone` | Un émoji. |
| `resume` | Phrase d'introduction affichée sous le titre et dans le sommaire du PDF. |
| `ecran` | Écran de l'application décrit par le chapitre : ajoute le bouton **Ouvrir cet écran** et relie le bouton **?** d'en-tête. Valeurs : `overview`, `chat`, `trombi`, `courses`, `resultats`, `records`, `reseaute`, `documents`, `vieduclub`, `admin`, `droitsBureau`, `stats`, `journal`, `profil`. |
| `droit` | Si renseigné, le chapitre n'est visible que des rôles qui ont cette fonctionnalité (`membres.admin`, `roles.admin`, `journal.voir`, `resultats.saisie`…). Plusieurs possibles séparés par `\|` (au moins une suffit). Le chapitre garde un cadenas 🔒 et le PDF indique à qui il est réservé. |

L'identifiant du chapitre (pour les liens) est le nom du fichier sans le numéro : `04-trombinoscope.md` → `trombinoscope`.

## Écrire le contenu

Le contenu est du **Markdown** classique : `## Titre de section` (chaque `##` apparaît dans « Sur cette page »), `### Sous-titre`,
`**gras**`, listes à puces `- `, listes numérotées `1. `, tableaux, `code`. Le tutoiement est utilisé dans toute l'aide.

### Blocs spéciaux

```
:::etapes
1. Première action.
2. Deuxième action.
:::

:::astuce
Un conseil pratique.
:::

:::info Titre facultatif
Une précision utile.
:::

:::attention
Un point de vigilance.
:::

:::important
Une règle essentielle.
:::

:::faq Une question que se posent les adhérents ?
La réponse, en Markdown (listes et liens possibles).
:::
```

`etapes` affiche un pas à pas numéroté ; `astuce`, `info`, `attention` et `important` des encadrés colorés ; `faq` une question
qui se déplie à l'écran (et qui est dépliée sur le papier).

### Liens

- vers un autre chapitre : `[Rôles et droits](aide:roles-droits)` ;
- vers un écran de l'application : `[Ouvrir le trombinoscope](ecran:trombi)` (mêmes valeurs que le champ `ecran`) ;
- vers un site extérieur : `[texte](https://…)` (s'ouvre dans un nouvel onglet).

## Le PDF

- **Depuis l'application** : chapitre ouvert → **Imprimer ce chapitre** ou **Manuel complet (PDF)** : la boîte d'impression du
  navigateur s'ouvre, choisir **Enregistrer au format PDF**. Le manuel contient les chapitres que l'adhérent a le droit de voir.
- **Fichier PDF complet (tous les chapitres, y compris l'administration)** : `npm run aide:pdf` crée `docs/Aide-espace-adherent.pdf`
  (option `-- --out=mon-fichier.pdf` pour un autre emplacement). Nécessite Google Chrome sur l'ordinateur ; si Chrome n'est pas
  détecté : `CHROME_PATH="/chemin/vers/chrome" npm run aide:pdf`.

## Fichiers

| Fichier | Contenu |
|---|---|
| `chapitres/*.md` | Le texte de l'aide (à modifier). |
| `render.js` | Moteur Markdown → HTML (blocs spéciaux, liens, sommaire). |
| `document.js` | Assemblage du manuel imprimable (couverture, sommaire, chapitres). |
| `aide.css` | Mise en page à l'écran et au format papier / PDF. |
| `index.js` | Chargement des chapitres dans l'application. |
| `../pages/adherent/AidePanel.jsx` | L'écran Aide (menu des chapitres, recherche, impression). |
| `../../scripts/aide-pdf.mjs` | Génération du fichier PDF. |
