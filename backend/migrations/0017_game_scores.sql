SET NAMES utf8mb4;

-- Meilleur score de chaque adhérent au mini-jeu « SAM Run » (œuf de Pâques du site) :
-- une ligne par adhérent, en mètres parcourus.
CREATE TABLE IF NOT EXISTS game_scores (
    member_id INT NOT NULL PRIMARY KEY,
    best_meters INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_game_scores_best (best_meters),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
