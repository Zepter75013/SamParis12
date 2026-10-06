SET NAMES utf8mb4;

-- Messagerie : pièces jointes (photos, vidéos, documents), sondages et événements, comme dans WhatsApp.
-- Cette migration peut être relancée sans erreur.

-- Type de message : text, media (photos / vidéos / documents, avec légende éventuelle), poll, event.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'kind') = 0,
    'ALTER TABLE chat_messages ADD COLUMN kind ENUM(\'text\', \'media\', \'poll\', \'event\') NOT NULL DEFAULT \'text\' AFTER body',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Fichiers d'un message. Les fichiers eux-mêmes sont sur le disque du serveur (uploads/chat) et ne sont servis
-- qu'aux adhérents connectés, par des liens signés de courte durée.
CREATE TABLE IF NOT EXISTS chat_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    kind ENUM('image', 'video', 'file') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    KEY idx_chat_att_msg (message_id),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_polls (
    message_id BIGINT NOT NULL PRIMARY KEY,
    question VARCHAR(255) NOT NULL,
    multiple BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_poll_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    position INT NOT NULL,
    texte VARCHAR(100) NOT NULL,
    KEY idx_chat_opt_msg (message_id, position),
    FOREIGN KEY (message_id) REFERENCES chat_polls(message_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_poll_votes (
    option_id BIGINT NOT NULL,
    member_id INT NOT NULL,
    message_id BIGINT NOT NULL,
    PRIMARY KEY (option_id, member_id),
    KEY idx_chat_vote_msg (message_id, member_id),
    FOREIGN KEY (option_id) REFERENCES chat_poll_options(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Événement proposé dans une discussion (date et heure « du mur », sans fuseau : le club est à Paris).
CREATE TABLE IF NOT EXISTS chat_events (
    message_id BIGINT NOT NULL PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    debut DATETIME NOT NULL,
    lieu VARCHAR(200) NOT NULL DEFAULT '',
    description VARCHAR(1000) NOT NULL DEFAULT '',
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_event_rsvps (
    message_id BIGINT NOT NULL,
    member_id INT NOT NULL,
    reponse ENUM('oui', 'peut-etre', 'non') NOT NULL,
    PRIMARY KEY (message_id, member_id),
    FOREIGN KEY (message_id) REFERENCES chat_events(message_id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
