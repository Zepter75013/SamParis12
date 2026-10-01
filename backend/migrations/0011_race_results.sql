SET NAMES utf8mb4;

ALTER TABLE races
    ADD COLUMN distance_km DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER type;

ALTER TABLE members
    ADD COLUMN droit_saisie_resultats BOOLEAN NOT NULL DEFAULT FALSE AFTER droit_upload_documents;

-- Résultat officiel d'un adhérent sur une course, saisi manuellement par un
-- membre ayant le droit de saisie des résultats (bureau ou droit dédié).
-- L'allure (vitesse) n'est pas stockée : elle est recalculée à la volée à
-- partir de distance_km et temps_secondes.
CREATE TABLE IF NOT EXISTS race_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    race_id INT NOT NULL,
    member_id INT NOT NULL,
    temps_secondes INT NOT NULL,
    classement_general INT NULL,
    classement_general_total INT NULL,
    categorie VARCHAR(20) NOT NULL DEFAULT '',
    classement_categorie INT NULL,
    classement_categorie_total INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_race_member_result (race_id, member_id),
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
