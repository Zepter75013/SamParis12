---
titre: Admin Club
icone: 🛠️
resume: Créer et gérer les adhérents, envoyer les invitations, générer un code d'accès.
ecran: admin
droit: membres.admin
---

**Admin Club** est l'espace de gestion des adhérents. Il n'apparaît dans le menu que si ton rôle comprend la fonctionnalité **Administrer les adhérents** (par défaut : le Bureau et le Super administrateur).

## La liste des adhérents

Le tableau affiche, pour chaque adhérent : sa photo, son **nom**, son **prénom**, son **email**, son **groupe**, son **statut**, son **rôle** dans l'application et l'**activation de son compte**.

- Clique sur l'**en-tête d'une colonne** pour trier (un second clic inverse l'ordre).
- La recherche (« Rechercher un adhérent… ») filtre la liste pendant que tu tapes.
- Clique sur une ligne pour ouvrir la **fiche complète** de l'adhérent.

## Créer un adhérent

:::etapes
1. Clique sur **+ Nouvel adhérent**.
2. Renseigne au minimum l'**email**, le **prénom** et le **nom**. Choisis le **groupe**, le **statut**, le **sexe** et son **Rôle dans l'application** (Adhérent par défaut).
3. Valide : le compte est créé.
4. Le site te propose d'**envoyer tout de suite l'email de bienvenue** (bouton **Envoyer l'email maintenant**). Tu peux aussi le faire plus tard.
:::

L'email de bienvenue contient le lien pour que l'adhérent définisse son mot de passe. Dans la colonne **Activation du compte** :

- **En attente** : aucun email de bienvenue n'a été envoyé ;
- **Email envoyé le …** : l'invitation est partie, l'adhérent n'a pas encore défini son mot de passe ; le lien **Renvoyer l'email** permet de la renvoyer ;
- **✓ Activé le …** : l'adhérent s'est connecté et a défini son mot de passe.

## Modifier la fiche d'un adhérent

Dans la fiche, tu peux compléter ou corriger toutes les informations : identité, coordonnées, licence, dates d'adhésion, certificat médical, cotisation, activité de la saison, etc. Clique sur **Enregistrer les modifications**. L'**adresse email** se change à part, avec son propre bouton **Enregistrer**.

### Donner un rôle à un adhérent

Dans la fiche, le champ **Rôle dans l'application** détermine les écrans et les actions auxquels l'adhérent a accès (voir [Rôles et droits](aide:roles-droits)). Un adhérent a toujours un rôle ; **Adhérent** est le rôle le plus simple, sans aucune fonctionnalité d'administration.

:::attention
Au moins un adhérent doit toujours pouvoir gérer les rôles. Le site refuse de retirer ce droit au dernier administrateur des rôles, et de le supprimer.
:::

## Aider un adhérent qui n'arrive pas à se connecter

Si un adhérent a perdu son email ou n'arrive pas à définir son mot de passe, utilise **Générer un code d'accès** sur sa ligne. Le site affiche un code que tu lui communiques (par téléphone, par exemple). L'adhérent le saisit via **J'ai déjà un code (communiqué par le bureau)** sur l'écran de connexion et choisit son mot de passe.

:::info
Le code est valable **15 minutes**. Ne l'envoie qu'à l'adhérent concerné.
:::

## Supprimer un adhérent

Dans la fiche, le bouton **Supprimer l'adhérent** demande une **confirmation** (« Supprimer cet adhérent ? »). La suppression est **définitive** : elle efface aussi ses résultats, ses inscriptions et ses messages.

:::attention
Avant de supprimer, vérifie si le statut **Anciens adhérents** ne suffit pas : l'adhérent reste alors dans l'historique du club sans apparaître parmi les adhérents actifs.
:::

:::info
Chaque action d'administration (création, modification, suppression, envoi d'invitation, génération de code) est enregistrée dans le [Journal d'activité](aide:journal).
:::
