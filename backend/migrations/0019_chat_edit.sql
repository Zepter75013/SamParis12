SET NAMES utf8mb4;

-- Un message peut être modifié ou supprimé par son auteur tant qu'aucun autre adhérent ne l'a lu ;
-- edited_at garde trace de la modification (mention « modifié »).
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'edited_at') = 0,
    'ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP NULL AFTER deleted_at',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
