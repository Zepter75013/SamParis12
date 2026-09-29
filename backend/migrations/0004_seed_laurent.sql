SET NAMES utf8mb4;

INSERT INTO members (
    email, password_hash, must_change_password,
    prenom, nom, role, groupe, statut, is_bureau
) VALUES (
    'laurentattal@free.fr',
    '$2a$10$Vht/2L6hqKO/MTcTX3XxgOfW7HHILc.tEopcytEOEPvlTOWX0PnYW',
    FALSE,
    'Laurent', 'ATTAL', 'Gentil Organisateur', 'Running', 'Adhérents 2027', TRUE
)
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    must_change_password = VALUES(must_change_password),
    prenom = VALUES(prenom),
    nom = VALUES(nom),
    role = VALUES(role),
    is_bureau = VALUES(is_bureau);
