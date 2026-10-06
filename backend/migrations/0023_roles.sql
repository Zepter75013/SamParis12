SET NAMES utf8mb4;

-- Rôles de l'application et fonctionnalités d'administration par rôle (écran « Rôles et droits »).
-- Chaque adhérent a un rôle ; le rôle « Adhérent » est le plus simple : aucune fonctionnalité d'administration.
-- Cette migration peut être relancée sans erreur.

CREATE TABLE IF NOT EXISTS app_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(60) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    est_bureau BOOLEAN NOT NULL DEFAULT FALSE,   -- les adhérents de ce rôle font partie du bureau (salon Bureau, badge)
    est_super BOOLEAN NOT NULL DEFAULT FALSE,    -- toutes les fonctionnalités, présentes et futures (non modifiable)
    systeme BOOLEAN NOT NULL DEFAULT FALSE,      -- rôle de base : non supprimable, non renommable
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_app_roles_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fonctionnalités accordées à un rôle (codes : membres.admin, documents.upload, resultats.saisie, etc.).
CREATE TABLE IF NOT EXISTS app_role_features (
    role_id INT NOT NULL,
    feature VARCHAR(40) NOT NULL,
    PRIMARY KEY (role_id, feature),
    FOREIGN KEY (role_id) REFERENCES app_roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND COLUMN_NAME = 'role_app_id') = 0,
    'ALTER TABLE members ADD COLUMN role_app_id INT NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND CONSTRAINT_NAME = 'fk_members_role_app') = 0,
    'ALTER TABLE members ADD CONSTRAINT fk_members_role_app FOREIGN KEY (role_app_id) REFERENCES app_roles(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rôles de base.
INSERT IGNORE INTO app_roles (nom, description, est_bureau, est_super, systeme) VALUES
    ('Adhérent', 'Adhérent du club : aucune fonctionnalité d''administration.', 0, 0, 1),
    ('Bureau', 'Membre du bureau : administre les adhérents, ajoute des documents, modère la messagerie.', 1, 0, 0),
    ('Super administrateur', 'Toutes les fonctionnalités, dont la gestion des rôles et des droits.', 1, 1, 1);

-- Le rôle Bureau reprend ce que le statut « bureau » permettait déjà.
INSERT IGNORE INTO app_role_features (role_id, feature)
SELECT r.id, f.feature FROM app_roles r
JOIN (SELECT 'membres.admin' AS feature UNION ALL SELECT 'documents.upload' UNION ALL SELECT 'messagerie.moderer') f
WHERE r.nom = 'Bureau';

-- Reprise des anciens droits individuels des membres du bureau (événements, résultats, salons) : un rôle
-- « Bureau + … » est créé pour chaque combinaison existante ; il se renomme ou se modifie ensuite dans l'écran.
INSERT IGNORE INTO app_roles (nom, description, est_bureau, est_super, systeme)
SELECT DISTINCT
    CONCAT('Bureau + ', CONCAT_WS(', ', IF(droit_admin_evenements, 'événements', NULL), IF(droit_saisie_resultats, 'résultats', NULL), IF(droit_creer_salons, 'salons', NULL))),
    'Créé automatiquement à partir des anciens droits individuels de ces membres du bureau.', 1, 0, 0
FROM members
WHERE is_bureau = 1 AND is_super_admin = 0 AND role_app_id IS NULL
  AND (droit_admin_evenements OR droit_saisie_resultats OR droit_creer_salons);

INSERT IGNORE INTO app_role_features (role_id, feature)
SELECT r.id, f.feature FROM app_roles r
JOIN app_role_features f ON f.role_id = (SELECT id FROM app_roles WHERE nom = 'Bureau')
WHERE r.nom LIKE 'Bureau + %';
INSERT IGNORE INTO app_role_features (role_id, feature) SELECT id, 'evenements.admin' FROM app_roles WHERE nom LIKE 'Bureau + %' AND nom LIKE '%événements%';
INSERT IGNORE INTO app_role_features (role_id, feature) SELECT id, 'resultats.saisie' FROM app_roles WHERE nom LIKE 'Bureau + %' AND nom LIKE '%résultats%';
INSERT IGNORE INTO app_role_features (role_id, feature) SELECT id, 'messagerie.salons' FROM app_roles WHERE nom LIKE 'Bureau + %' AND nom LIKE '%salons%';

-- Attribution des rôles aux adhérents existants (seulement ceux qui n'en ont pas encore).
UPDATE members SET role_app_id = (SELECT id FROM app_roles WHERE nom = 'Super administrateur')
WHERE role_app_id IS NULL AND is_super_admin = 1;

UPDATE members m JOIN app_roles r ON r.nom = CONCAT('Bureau + ', CONCAT_WS(', ', IF(m.droit_admin_evenements, 'événements', NULL), IF(m.droit_saisie_resultats, 'résultats', NULL), IF(m.droit_creer_salons, 'salons', NULL)))
SET m.role_app_id = r.id
WHERE m.role_app_id IS NULL AND m.is_bureau = 1 AND (m.droit_admin_evenements OR m.droit_saisie_resultats OR m.droit_creer_salons);

UPDATE members SET role_app_id = (SELECT id FROM app_roles WHERE nom = 'Bureau')
WHERE role_app_id IS NULL AND is_bureau = 1;

UPDATE members SET role_app_id = (SELECT id FROM app_roles WHERE nom = 'Adhérent')
WHERE role_app_id IS NULL;
