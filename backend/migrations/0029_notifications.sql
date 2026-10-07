SET NAMES utf8mb4;

-- Notifications de l'espace adhérent : push (navigateur, téléphone) et e-mail.
--   notif_prefs        : choix de chaque adhérent, par type d'événement et par canal. Sans ligne, les valeurs par défaut
--                        s'appliquent (e-mail activé ; push activé dès qu'un appareil est abonné, ce qui demande l'accord
--                        explicite de l'adhérent dans son navigateur).
--   push_subscriptions : appareils abonnés au push (un adhérent peut en avoir plusieurs : ordinateur, téléphone…).
--   notifications      : chaque notification envoyée, pour savoir si elle a été vue et, sinon, l'envoyer par e-mail
--                        une heure plus tard (mail_due_at). Les messages d'une même discussion sont regroupés (nombre).
-- Cette migration peut être relancée sans erreur.

CREATE TABLE IF NOT EXISTS notif_prefs (
    member_id INT NOT NULL PRIMARY KEY,
    push_messages BOOLEAN NOT NULL DEFAULT TRUE,
    push_courses BOOLEAN NOT NULL DEFAULT TRUE,
    push_documents BOOLEAN NOT NULL DEFAULT TRUE,
    mail_messages BOOLEAN NOT NULL DEFAULT TRUE,
    mail_courses BOOLEAN NOT NULL DEFAULT TRUE,
    mail_documents BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    endpoint_hash CHAR(64) NOT NULL,     -- SHA-256 de l'adresse d'abonnement (l'adresse est trop longue pour un index)
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    appareil VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_push_endpoint (endpoint_hash),
    KEY idx_push_member (member_id),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    kind VARCHAR(20) NOT NULL,           -- message, course, rappel, document
    ref_id INT NOT NULL,                 -- discussion, course ou document concerné
    titre VARCHAR(200) NOT NULL,
    corps VARCHAR(500) NOT NULL DEFAULT '',
    url VARCHAR(255) NOT NULL DEFAULT '',
    nombre INT NOT NULL DEFAULT 1,       -- messages regroupés dans la même notification
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    seen_at TIMESTAMP NULL,
    mail_due_at TIMESTAMP NULL,          -- NULL : pas d'e-mail prévu (adhérent qui ne les veut pas)
    mailed_at TIMESTAMP NULL,
    KEY idx_notif_member (member_id, kind, ref_id),
    KEY idx_notif_mail (mailed_at, seen_at, mail_due_at),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
