---
titre: Rôles et droits
icone: 🔐
resume: Choisir qui peut faire quoi dans l'application, avec des rôles et des fonctionnalités.
ecran: droitsBureau
droit: roles.admin
---

L'écran **Rôles et droits** permet de décider **qui peut faire quoi**. Il est réservé aux adhérents dont le rôle comprend **Gérer les rôles et les droits** (par défaut : le Super administrateur).

## Le principe

- Chaque adhérent a **un rôle** (champ **Rôle dans l'application** de sa fiche, dans [Admin Club](aide:admin-club)).
- Chaque rôle reçoit des **fonctionnalités** : ce sont les droits d'administration. Le rôle **Adhérent** n'en a aucune.
- Les écrans et les boutons n'apparaissent que si le rôle de l'adhérent y donne droit ; le serveur refuse de toute façon les actions non autorisées.

## Les fonctionnalités

| Fonctionnalité | Ce qu'elle permet |
|---|---|
| Administrer les adhérents | L'écran **Admin Club** : créer, modifier, supprimer des adhérents, inviter, générer un code. |
| Administrer les événements | Droit réservé pour les prochaines évolutions. |
| Ajouter des documents | Déposer des documents dans **Plans & Documents**. |
| Saisir les résultats | Saisir, modifier et supprimer les résultats de courses. |
| Créer des salons de discussion | Créer des salons dans la messagerie et choisir leurs participants. |
| Modérer la messagerie | Supprimer les messages des autres adhérents. |
| Statistiques : effectifs | La section **Effectifs** de l'écran Statistiques. |
| Statistiques : courses | La section **Courses** (avec l'assiduité nominative). |
| Statistiques : engagement | La section **Engagement** (connexions, fiches incomplètes). |
| Consulter le journal d'activité | L'écran **Journal d'activité**. |
| Gérer les rôles et les droits | Cet écran. |

## Les rôles de base

- **Adhérent** : aucune fonctionnalité d'administration. Ce rôle ne peut pas être modifié ni supprimé.
- **Bureau** : administre les adhérents, ajoute des documents, modère la messagerie et consulte les statistiques.
- **Super administrateur** : possède **toutes** les fonctionnalités, y compris celles qui seront ajoutées plus tard. Il ne peut pas être modifié.

Tu peux créer autant de rôles que nécessaire (par exemple **Entraîneur** avec les seules statistiques de courses).

## Modifier les droits d'un rôle

:::etapes
1. Choisis le **Rôle** dans la liste du haut (le nombre entre parenthèses indique combien d'adhérents l'ont).
2. À gauche, les **Fonctionnalités disponibles** ; à droite, celles **accordées au rôle**.
3. **Sélectionne** une ou plusieurs fonctionnalités : un clic pour une seule, **Cmd/Ctrl + clic** pour en ajouter ou retirer une, **Shift + clic** pour une plage.
4. **Glisse-les** d'une liste à l'autre, ou utilise les boutons du milieu (les doubles flèches déplacent tout).
5. Clique sur **Enregistrer**. **Annuler** abandonne tes changements.
:::

Le changement s'applique **tout de suite** à tous les adhérents du rôle.

## Créer, renommer, supprimer un rôle

- **＋ Nouveau rôle** : saisis un nom (par exemple *Entraîneur*) puis clique sur **Créer** ; règle ensuite ses fonctionnalités.
- Un rôle peut être renommé, décrit, et marqué comme appartenant au **bureau** (les adhérents de ce rôle rejoignent le salon Bureau et reçoivent le badge).
- La **suppression** n'est possible que si **plus aucun adhérent** n'a ce rôle : change d'abord le rôle de ces adhérents dans leur fiche (Admin Club).

:::attention
Il doit toujours rester au moins un adhérent capable de gérer les rôles : le site refuse de retirer ce droit au dernier administrateur.
:::

Chaque changement de rôle est enregistré dans le [Journal d'activité](aide:journal).
