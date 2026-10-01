SET NAMES utf8mb4;

-- Suivi de l'email de bienvenue envoyé par le bureau à un nouvel adhérent
-- (date du dernier envoi) et de l'activation du compte par l'adhérent
-- lui-même (date à laquelle il a défini son mot de passe pour la première fois).
ALTER TABLE members
    ADD COLUMN welcome_email_sent_at TIMESTAMP NULL AFTER must_change_password,
    ADD COLUMN activated_at TIMESTAMP NULL AFTER welcome_email_sent_at;
