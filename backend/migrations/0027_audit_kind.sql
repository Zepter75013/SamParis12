SET NAMES utf8mb4;

-- Journal d'activité : type de chaque action, pour pouvoir filtrer.
--   modification : l'action écrit en base (création, modification, suppression, envoi d'un message…)
--   navigation   : consultation d'un écran ou d'une liste, export (aucune donnée modifiée)
--   connexion    : connexion, demande de code d'accès
-- Cette migration peut être relancée sans erreur.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND COLUMN_NAME = 'kind') = 0,
    'ALTER TABLE audit_log ADD COLUMN kind VARCHAR(12) NOT NULL DEFAULT ''modification'' AFTER action',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Classement des lignes déjà enregistrées d'après leur libellé ; tout le reste est une modification.
UPDATE audit_log SET kind = 'connexion'
WHERE action IN ('Connexion', 'Demande de code de réinitialisation du mot de passe');
UPDATE audit_log SET kind = 'navigation'
WHERE action LIKE 'Consultation%' OR action LIKE 'Export CSV%' OR action LIKE 'Ouverture de l''écran%';
