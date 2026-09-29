SET NAMES utf8mb4;

-- Une course proposée par un adhérent (n'importe qui peut en créer une) et
-- sur laquelle les autres adhérents peuvent s'inscrire pour indiquer qu'ils
-- y participent.
CREATE TABLE IF NOT EXISTS races (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    race_date DATE NOT NULL,
    lieu VARCHAR(150) NOT NULL DEFAULT '',
    type VARCHAR(100) NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    site_internet VARCHAR(255) NOT NULL DEFAULT '',
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inscription d'un adhérent à une course : un adhérent ne peut s'inscrire
-- qu'une seule fois à la même course.
CREATE TABLE IF NOT EXISTS race_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    race_id INT NOT NULL,
    member_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_race_member (race_id, member_id),
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
