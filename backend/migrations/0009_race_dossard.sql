SET NAMES utf8mb4;

-- Un adhérent peut signaler qu'il recherche un dossard pour une course, ou
-- qu'il cherche à céder le sien — indépendamment de son inscription
-- ("J'y participe"). Les deux déclarations peuvent coexister (rare) ou être
-- retirées à tout moment par l'adhérent lui-même.
CREATE TABLE IF NOT EXISTS race_dossard_signals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    race_id INT NOT NULL,
    member_id INT NOT NULL,
    kind ENUM('recherche', 'cession') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_race_member_kind (race_id, member_id, kind),
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
