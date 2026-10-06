SET NAMES utf8mb4;

-- Messagerie de l'espace adhérent (façon WhatsApp) : salons automatiques par groupe, salons créés par
-- les adhérents autorisés, et messages privés entre deux adhérents.

-- Droit « Créer des salons de discussion » (réglable dans Fonctionnalités par un SuperAdmin).
-- Cette migration (comme 0019 et 0021) peut être relancée sans erreur : l'ajout de colonne est conditionnel.
SET @ddl = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members' AND COLUMN_NAME = 'droit_creer_salons') = 0,
    'ALTER TABLE members ADD COLUMN droit_creer_salons BOOLEAN NOT NULL DEFAULT FALSE AFTER droit_saisie_resultats',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- kind : auto (membres déduits du profil via auto_rule), custom (membres choisis), dm (message privé, dm_key = "petitId-grandId").
CREATE TABLE IF NOT EXISTS chat_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kind ENUM('auto', 'custom', 'dm') NOT NULL,
    auto_rule ENUM('all', 'running', 'marche', 'bureau') NULL,
    nom VARCHAR(100) NOT NULL DEFAULT '',
    dm_key VARCHAR(40) NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chat_dm_key (dm_key),
    UNIQUE KEY uq_chat_auto_rule (auto_rule),
    FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Membres explicites des salons custom et des messages privés.
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id INT NOT NULL,
    member_id INT NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, member_id),
    KEY idx_chat_rm_member (member_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    body TEXT NOT NULL,
    reply_to BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    KEY idx_chat_msg_room (room_id, id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dernier message lu par chaque adhérent dans chaque salon (messages non lus, coches de lecture).
CREATE TABLE IF NOT EXISTS chat_reads (
    room_id INT NOT NULL,
    member_id INT NOT NULL,
    last_read_id BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (room_id, member_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO chat_rooms (kind, auto_rule, nom) VALUES
    ('auto', 'all', 'Tous les adhérents'),
    ('auto', 'running', 'Running'),
    ('auto', 'marche', 'Marche nordique'),
    ('auto', 'bureau', 'Bureau');
