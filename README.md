# SAM Paris 12 — nouveau site

Refonte du site du club d'athlétisme SAM Paris 12 : interface moderne, responsive
mobile-first, base de données MySQL. Une PWA (installable, hors-ligne) est prévue
pour une phase ultérieure.

## Stack

- **Backend** : Go (stdlib `net/http`), MySQL (`go-sql-driver/mysql`)
- **Frontend** : React + Vite, Tailwind CSS v4, React Router
- **Déploiement** : Docker Compose, sur le même NAS que les autres apps
  (conteneur MySQL partagé `bdd-mysql`)

## Contenu actuel (V1)

Site vitrine public uniquement : accueil, présentation du club, sections
d'entraînement, actualités, calendrier, partenaires, contact. Le contenu en base
(`backend/migrations/0002_seed.sql`) est un **exemple à remplacer** par le contenu
réel du club (textes, encadrants, horaires, logo).

Espace adhérent et back-office ne sont pas inclus dans cette V1.

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
- Remplacer le contenu d'exemple en base par le contenu réel (histoire du club,
  bureau, sections, actualités, partenaires).
- Basculer le DNS de samparis12.org vers le nouveau site une fois validé.
- Phase 2 : PWA (manifest, service worker, installabilité, mode hors-ligne).
