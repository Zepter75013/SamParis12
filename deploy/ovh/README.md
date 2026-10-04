# Déploiement sur un serveur OVH (VPS) — samparis12.juliotte-app.fr

Pré-requis : un serveur Linux avec Docker + le plugin Compose, un accès SSH, et un enregistrement DNS
`samparis12.juliotte-app.fr` → IP du serveur (type A).

## 1. Copier le projet et configurer

```bash
rsync -avz --exclude='.env' --exclude='.git/' --exclude='frontend/node_modules/' --exclude='frontend/dist/' \
  --exclude='member-photos/' --exclude='club-documents/' \
  ./SamParis12/ utilisateur@IP_DU_SERVEUR:~/samparis12/
ssh utilisateur@IP_DU_SERVEUR
cd ~/samparis12/deploy/ovh && cp .env.example .env && nano .env
```

## 2. Démarrer

- Serveur sans reverse-proxy (ports 80/443 libres) : Caddy gère le HTTPS tout seul.
  ```bash
  docker compose --profile caddy up -d --build
  ```
- Serveur avec un reverse-proxy existant (nginx, Traefik…) : démarrer sans Caddy, puis pointer le
  reverse-proxy vers `http://127.0.0.1:8094` pour le nom `samparis12.juliotte-app.fr`.
  ```bash
  docker compose up -d --build
  ```

Au premier démarrage, MySQL crée la base à partir de `backend/migrations` (schéma + contenu de démonstration).

## 3. (Option) Reprendre la base et les fichiers du NAS

Sur le NAS, exporter la base et copier les dossiers de fichiers :

```bash
ssh -t -p 2222 Laurent@192.168.1.79 "sudo /share/CACHEDEV1_DATA/.qpkg/container-station/bin/docker exec bdd-mysql mysqldump -uSamParis12Admin -p --single-transaction --no-tablespaces samparis12db > /tmp/samparis12.sql"
```

Sur le serveur OVH : commenter la ligne `docker-entrypoint-initdb.d` du service `mysql` AVANT le premier
démarrage, démarrer MySQL seul (`docker compose up -d mysql`), puis importer :

```bash
docker exec -i samparis12-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" samparis12db' < samparis12.sql
```

Copier ensuite `member-photos/` et `club-documents/` du NAS vers `deploy/ovh/data/member-photos/` et
`deploy/ovh/data/club-documents/`, puis `docker compose up -d --build`.

## 4. Mises à jour

```bash
rsync … (comme au point 1) && ssh utilisateur@IP "cd ~/samparis12/deploy/ovh && docker compose up -d --build"
```

Les nouvelles migrations (`0017_…`) ne sont pas rejouées automatiquement sur une base existante :
les appliquer à la main avec `docker exec -i samparis12-mysql … < fichier.sql`.
