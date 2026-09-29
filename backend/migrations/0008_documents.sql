SET NAMES utf8mb4;

-- Droit accordé sous le statut bureau : permet d'ajouter des documents
-- (plans d'entraînement, résultats, documents officiels) sans être
-- soi-même membre du bureau.
ALTER TABLE members ADD COLUMN droit_upload_documents BOOLEAN NOT NULL DEFAULT FALSE AFTER droit_admin_evenements;

-- Un document (PDF) mis à disposition des adhérents dans l'onglet
-- Plans & Documents — visible et téléchargeable par tous, ajouté
-- uniquement par le bureau ou un adhérent ayant le droit d'upload.
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    categorie VARCHAR(150) NOT NULL DEFAULT '',
    auteur VARCHAR(150) NOT NULL DEFAULT '',
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
