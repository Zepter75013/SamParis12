SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,

    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    role VARCHAR(150) NOT NULL DEFAULT '',
    groupe VARCHAR(100) NOT NULL DEFAULT '',
    statut VARCHAR(50) NOT NULL DEFAULT '',
    is_bureau BOOLEAN NOT NULL DEFAULT FALSE,

    -- Informations confidentielles : éditables par l'adhérent lui-même.
    date_naissance DATE NULL,
    lieu_naissance VARCHAR(150) NOT NULL DEFAULT '',
    adresse VARCHAR(255) NOT NULL DEFAULT '',
    code_postal VARCHAR(10) NOT NULL DEFAULT '',
    ville VARCHAR(100) NOT NULL DEFAULT '',
    telephone_domicile VARCHAR(20) NOT NULL DEFAULT '',
    telephone_portable VARCHAR(20) NOT NULL DEFAULT '',
    nationalite VARCHAR(50) NOT NULL DEFAULT '',
    urgence_nom VARCHAR(150) NOT NULL DEFAULT '',
    urgence_telephone VARCHAR(20) NOT NULL DEFAULT '',
    taille_maillot VARCHAR(5) NOT NULL DEFAULT '',
    vma DECIMAL(4,2) NULL,
    vma_date DATE NULL,

    -- Informations administratives : lecture seule pour l'adhérent, gérées par le bureau.
    numero_licence VARCHAR(50) NOT NULL DEFAULT '',
    licencie_par VARCHAR(150) NOT NULL DEFAULT '',
    fonction_bureau VARCHAR(150) NOT NULL DEFAULT '',
    droit_admin_evenements BOOLEAN NOT NULL DEFAULT FALSE,
    origine_contact VARCHAR(150) NOT NULL DEFAULT '',
    annee_premiere_adhesion SMALLINT NULL,
    date_premiere_adhesion DATE NULL,
    date_dernier_certificat DATE NULL,
    annee_derniere_adhesion SMALLINT NULL,
    activite_saison VARCHAR(100) NOT NULL DEFAULT '',
    licence_ffa_type VARCHAR(100) NOT NULL DEFAULT '',
    montant_cotisation DECIMAL(6,2) NULL,
    date_paiement_cotisation DATE NULL,
    mode_paiement VARCHAR(50) NOT NULL DEFAULT '',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
