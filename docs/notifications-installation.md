# Notifications push et e-mail — mise en service

Les adhérents sont prévenus d'un **message reçu**, d'une **nouvelle course**, du **rappel la veille** d'une course à
laquelle ils sont inscrits (à partir de 18 h, heure de Paris) et d'un **nouveau document** :

- **push** (standard Web Push, sans service payant) : immédiat, sur chaque appareil que l'adhérent a activé dans
  *Tes informations › Notifications* ;
- **e-mail** : seulement si l'élément n'a pas été vu **dans l'heure** (récapitulatif regroupé), via le SMTP déjà
  configuré.

Choix par défaut : e-mail activé pour tout ; push actif dès qu'un appareil est abonné. Les annonces du club ne sont pas
encore concernées : elles sont écrites dans le code, il n'existe pas d'écran pour en publier.

## Mise en service (une seule fois)

1. **Migration** `backend/migrations/0029_notifications.sql` (tables `notif_prefs`, `push_subscriptions`,
   `notifications`).
2. **Clés VAPID du club**, générées une seule fois (`go run ./cmd/vapid` dans `backend/`) et ajoutées au `.env` du NAS :
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (secrète), `VAPID_SUBJECT` (adresse de contact, par défaut
   `contact@samparis12.org`). **Ne jamais les changer ensuite** : tous les appareils seraient désabonnés.
   Sans clés, le push est désactivé mais les e-mails fonctionnent.
3. `docker compose up -d --build` : `docker-compose.yml` transmet ces variables à l'API.

## Bon à savoir

- **iPhone / iPad** : le push ne fonctionne que si le site est installé sur l'écran d'accueil (iOS 16.4+) ; l'écran
  l'explique à l'adhérent.
- Un appareil qui a retiré l'autorisation est oublié automatiquement au premier envoi refusé (réponse 404/410).
- La tâche de fond tourne chaque minute dans l'API (e-mails dus, rappels du lendemain) ; un redémarrage dans la soirée
  ne renvoie pas les rappels déjà partis.
- Tests d'intégration : `NOTIF_TEST_DSN='user:mdp@tcp(hôte:port)/base?parseTime=true' go test ./internal/notif`
  sur une base de test **jetable** (jamais la base réelle).
