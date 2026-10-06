SET NAMES utf8mb4;

-- Journal d'activité : qui a fait quoi dans l'application, et si l'action a réussi (écran « Journal d'activité »,
-- réservé aux rôles qui ont la fonctionnalité « Consulter le journal d'activité », par défaut le Super administrateur).
-- Les lignes sont conservées 12 mois puis supprimées automatiquement par l'API. Cette migration peut être relancée sans erreur.
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    member_id INT NULL,                                -- pas de clé étrangère : l'historique survit à la suppression de l'adhérent
    nom VARCHAR(120) NOT NULL DEFAULT '',              -- « NOM Prénom » au moment de l'action (ou « (identifiant inconnu) »)
    role VARCHAR(60) NOT NULL DEFAULT '',              -- rôle de l'adhérent au moment de l'action
    action VARCHAR(120) NOT NULL,
    detail VARCHAR(255) NOT NULL DEFAULT '',
    success BOOLEAN NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0,                -- code de réponse HTTP
    ip VARCHAR(45) NOT NULL DEFAULT '',
    KEY idx_audit_created (created_at),
    KEY idx_audit_member (member_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
