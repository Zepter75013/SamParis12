# SAM Paris 12 — nouveau site

Refonte du site du club SAM Paris 12 (course à pied hors stade, fondé en 1887,
Porte de Charenton) : page unique façon "carnet de course" (design et contenu
alignés sur la maquette fournie), responsive mobile-first, base de données
MySQL. Une PWA (installable, hors-ligne) est prévue pour une phase ultérieure.

## Stack

- **Backend** : Go (stdlib `net/http`), MySQL (`go-sql-driver/mysql`)
- **Frontend** : React + Vite, React Router, CSS bespoke (pas de framework
  utilitaire — voir `frontend/src/index.css`)
- **Déploiement** : Docker Compose, sur le même NAS que les autres apps
  (conteneur MySQL partagé `bdd-mysql`)

## Contenu actuel (V1)

Page unique (`/`) : hero, chiffres clés, puis six sections façon "kilomètres"
(le club, disciplines, terrain de jeu, Les Foulées du 12ème, adhésion, contact).
La majorité du contenu est statique dans `frontend/src/pages/Home.jsx` (texte,
disciplines, adresse) ; seul le partenaire affiché en pied de page vient de la
base MySQL (`backend/migrations/0002_seed.sql` — contenu d'exemple à ajuster).

Espace adhérent et back-office ne sont pas inclus dans cette V1. Les anciennes
pages actualités/calendrier/sections (V1 initiale) ont été retirées au profit
de cette page unique ; le backend garde leurs endpoints (`/api/news`,
`/api/events`, `/api/groups`, `/api/contact`) au cas où elles seraient
réintroduites plus tard.

## Développement local

Comme pour Finance et Record-manager, le développement se fait **sans Docker**
(Docker est réservé au déploiement NAS). Il faut un serveur MySQL local
(sur `localhost:3306`), avec une base et un utilisateur dédiés :

```sql
CREATE DATABASE IF NOT EXISTS samparis12db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'SamParis12Admin'@'localhost' IDENTIFIED BY '...';
GRANT ALL PRIVILEGES ON samparis12db.* TO 'SamParis12Admin'@'localhost';
FLUSH PRIVILEGES;
```

Renseigner ces identifiants dans `backend/.env` (non versionné, voir les variables
utilisées dans `internal/config/config.go`), puis :

```bash
cd backend
go run ./cmd/migrate   # crée les tables + contenu d'exemple (une seule fois)
go run ./cmd/api        # démarre l'API sur :8080
```

Dans un autre terminal, lancer le frontend :

```bash
cd frontend
npm install
npm run dev
```

Le frontend (http://localhost:5173) appelle directement `http://localhost:8080/api`
(voir `frontend/.env.local`, non versionné).

## Déploiement (NAS)

Copier `.env.example` en `.env` et renseigner les identifiants de la base
(à créer dans le conteneur MySQL existant `bdd-mysql`), puis :

```bash
docker compose up --build -d
```

## À faire avant mise en production

- Remplacer le logo placeholder (`frontend/src/components/Logo.jsx` et
  `frontend/public/favicon.svg`) par le logo officiel du club.
- Vérifier/ajuster le contenu statique de la page (adresse, tarifs, réseaux
  sociaux, lien de paiement) et le partenaire en base.
- Basculer le DNS de samparis12.org vers le nouveau site une fois validé.
- Phase 2 : PWA (manifest, service worker, installabilité, mode hors-ligne).
