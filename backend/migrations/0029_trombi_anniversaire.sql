SET NAMES utf8mb4;

-- Anniversaire dans le trombinoscope : le jour de son anniversaire, l'adhérent est fêté (gâteau, champagne, feu d'artifice).
-- Seul l'indicateur « c'est son anniversaire aujourd'hui » est transmis aux autres adhérents, jamais la date ni l'âge.
-- Chaque adhérent peut refuser dans « Tes informations ». Activé par défaut. Cette migration peut être relancée sans erreur.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND COLUMN_NAME = 'trombi_anniversaire') = 0,
    'ALTER TABLE members ADD COLUMN trombi_anniversaire BOOLEAN NOT NULL DEFAULT TRUE',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
