SET NAMES utf8mb4;

-- Préférences de chaque adhérent sur chaque discussion de la messagerie :
--   archived = 1 : discussion rangée dans « Archivées » (l'adhérent peut la désarchiver) ;
--   deleted  = 1 : discussion « supprimée » pour cet adhérent. Elle disparaît de son écran mais reste en base,
--                  avec tous ses messages. Il n'existe aucun moyen de la réactiver depuis le site : seul
--                  l'administrateur de la base peut le faire, par une requête SQL, par exemple :
--
--     UPDATE chat_room_prefs SET deleted = 0, deleted_at = NULL WHERE room_id = <salon> AND member_id = <adhérent>;
--
-- La suppression ne concerne que l'adhérent qui l'a faite : les autres participants gardent la discussion.
CREATE TABLE IF NOT EXISTS chat_room_prefs (
    room_id INT NOT NULL,
    member_id INT NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, member_id),
    KEY idx_chat_prefs_member (member_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
