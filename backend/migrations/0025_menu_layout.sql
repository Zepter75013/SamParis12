SET NAMES utf8mb4;

-- Disposition du menu de l'espace adhérent, choisie par chaque adhérent : 'horizontal' (onglets en haut, par défaut)
-- ou 'lateral' (menu à gauche). Cette migration peut être relancée sans erreur.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND COLUMN_NAME = 'menu_layout') = 0,
    'ALTER TABLE members ADD COLUMN menu_layout VARCHAR(12) NOT NULL DEFAULT \'horizontal\'',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
