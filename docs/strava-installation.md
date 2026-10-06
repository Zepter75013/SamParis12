# Liaison Strava — mise en service

L'écran **Mon activité** permet à chaque adhérent de relier son compte Strava et de consulter **ses propres** activités.
Il ne fonctionne qu'une fois l'application Strava du club créée et ses identifiants renseignés sur le NAS. Sans identifiants,
l'écran affiche « La liaison Strava n'est pas encore activée par le club » et le reste du site n'est pas affecté.

## À savoir avant de commencer (règles de Strava)

- **Données privées à l'adhérent** : depuis novembre 2024, une application ne peut montrer les données Strava d'un athlète
  qu'à cet athlète. L'écran respecte cette règle : aucune route ne renvoie l'activité d'un autre adhérent. Pas de classement,
  pas de totaux visibles du bureau.
- **Capacité** : une application Strava toute neuve ne peut connecter qu'**un seul athlète** (le propriétaire de l'application).
  Strava la passe à **10 athlètes** sur simple demande ; au-delà, il faut déposer une demande d'examen auprès de Strava
  (réponse non garantie pour une application de club). Le formulaire est accessible depuis la page de l'application
  (strava.com/settings/api) et la documentation : https://developers.strava.com/docs/getting-started/ .
- **Limites d'appels** : 100 requêtes / 15 min et 1 000 / jour à l'origine (200 / 2 000 après passage à 10 athlètes). L'écran
  garde les réponses en mémoire 5 minutes pour les ménager.

## 1. Créer l'application Strava

1. Se connecter à **strava.com** avec le compte qui sera propriétaire de l'application (ce compte est le premier athlète
   autorisé : choisir celui de la personne qui administre le site).
2. Ouvrir **https://www.strava.com/settings/api** (Réglages → Mon API).
3. Remplir le formulaire :

   | Champ | Valeur |
   |---|---|
   | Application Name | `SAM Paris 12` |
   | Category | `Community` (ou la plus proche : `Training`, `Social`…) |
   | Club | laisser vide |
   | Website | `https://samparis12.juliotte-app.fr` |
   | Application Description | `Espace adhérent du club d'athlétisme SAM Paris 12 : chaque adhérent peut consulter ses propres activités Strava.` |
   | Authorization Callback Domain | `samparis12.juliotte-app.fr` (le domaine seul : sans `https://` ni chemin) |
   | Logo | l'icône du club (image carrée) |

4. Valider. Strava affiche l'**ID client** et le **Code secret client** : les noter (le secret ne se partage pas).

## 2. Renseigner les identifiants sur le NAS

Ajouter deux lignes au fichier `.env` du projet (`/share/CACHEDEV1_DATA/Container/SamParis12/.env`) :

```
STRAVA_CLIENT_ID=<ID client>
STRAVA_CLIENT_SECRET=<Code secret client>
```

Commande (remplacer les deux valeurs) :

```bash
ssh -t -p 2222 Laurent@192.168.1.79 "cd /share/CACHEDEV1_DATA/Container/SamParis12 && printf 'STRAVA_CLIENT_ID=XXXXX\nSTRAVA_CLIENT_SECRET=YYYYY\n' >> .env"
```

## 3. Appliquer la migration et reconstruire

Migration `backend/migrations/0028_strava.sql` (table `strava_links`), puis `docker compose up -d --build` : voir les
commandes habituelles de déploiement.

## 4. Tester

Se connecter à l'espace adhérent avec le compte propriétaire de l'application Strava, ouvrir **Mon activité** et cliquer sur
**Se connecter avec Strava**. Un autre adhérent ne pourra se connecter qu'après le passage à 10 athlètes (étape ci-dessus).

## Sécurité et confidentialité

- Les jetons Strava sont stockés **chiffrés** (AES-256-GCM, clé dérivée de `JWT_SECRET`). **Changer `JWT_SECRET` rend les
  liaisons existantes illisibles** : les adhérents devront relier à nouveau leur compte.
- Aucune activité n'est enregistrée par le site ; seules la liaison (identité Strava + jetons) et un cache mémoire de 5 minutes
  existent. La suppression d'un adhérent supprime sa liaison.
- Le bouton **Déconnecter** révoque l'accès chez Strava et efface la liaison.
- Le journal d'activité trace la liaison, la déconnexion et la consultation (pas le contenu des activités).

## Charte graphique Strava

Les règles de marque de Strava (https://developers.strava.com/guidelines/) demandent d'utiliser leurs visuels officiels
(bouton « Connect with Strava », mention « Powered by Strava »). Le site affiche pour l'instant un bouton orange et une mention
textuelle ; à remplacer par les visuels officiels si l'application est soumise à l'examen de Strava.
