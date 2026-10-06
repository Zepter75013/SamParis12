SET NAMES utf8mb4;

-- Un message peut être modifié ou supprimé par son auteur tant qu'aucun autre adhérent ne l'a lu ;
-- edited_at garde trace de la modification (mention « modifié »).
ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP NULL AFTER deleted_at;
