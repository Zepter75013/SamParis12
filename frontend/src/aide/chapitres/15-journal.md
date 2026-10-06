---
titre: Journal d'activité
icone: 🧾
resume: Qui a fait quoi dans l'application, et si l'action a réussi.
ecran: journal
droit: journal.voir
---

Le **Journal d'activité** garde la trace de ce qui se passe dans l'application : qui a fait quoi, quand, avec quel rôle, et si l'action a réussi. Il est réservé aux adhérents dont le rôle comprend **Consulter le journal d'activité** (par défaut : le Super administrateur).

:::info
Le **contenu des messages** n'est jamais enregistré. Les lignes sont conservées **12 mois**, puis supprimées automatiquement.
:::

## Lire le journal

Chaque ligne indique la **date et l'heure**, le **nom prénom**, le **rôle**, le **type**, l'**action réalisée** (avec un détail : la fiche, la course, le salon concerné…) et le **résultat** : **✓ OK** ou **✗ Échec** (ligne surlignée). Survole une ligne pour voir l'adresse IP et le code de réponse.

## Les types d'action

La bascule **Type d'action** sépare :

- **Modifications** : toutes les actions qui **écrivent en base** (création, modification ou suppression d'une fiche, d'un rôle, d'une course, d'un résultat, d'un document, envoi d'un message…) ;
- **Navigation** : les actions qui **ne modifient rien** (ouverture d'un écran, consultation d'une liste ou d'une fiche, statistiques, exports) ;
- **Connexions** : les connexions à l'espace adhérent et les demandes de code d'accès ;
- **Toutes** : tout, sans distinction.

## Filtrer

Les filtres se combinent avec le type d'action :

- **Recherche** : dans le nom, l'action et le détail ;
- **Rôle** : les actions d'un rôle donné ;
- **Résultat** : tous, ou seulement les échecs (utile pour repérer une tentative de connexion ratée) ;
- **Du / Au** : une période.

Le compteur indique le nombre de lignes correspondant aux filtres. **Afficher les lignes plus anciennes** charge la suite. **Actualiser toutes les 10 s** met la liste à jour automatiquement.

## Exporter

**Exporter en CSV** enregistre les lignes affichées (avec la colonne **Type**) dans un fichier lisible avec Excel.

:::astuce
Pour savoir ce qui a été modifié dans la base cette semaine : choisis **Modifications**, puis la période dans **Du / Au**.
:::
