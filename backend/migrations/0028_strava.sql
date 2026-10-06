SET NAMES utf8mb4;

-- Liaison d'un adhérent avec son compte Strava (écran « Mon activité »). Seuls les jetons d'accès (chiffrés par l'API) et
-- l'identité de l'athlète sont conservés : les activités ne sont jamais enregistrées, elles sont lues chez Strava à chaque
-- consultation et ne sont montrées qu'à l'adhérent concerné (règle de l'API Strava). Un compte Strava ne peut être relié
-- qu'à un seul adhérent. Cette migration peut être relancée sans erreur.
CREATE TABLE IF NOT EXISTS strava_links (
    member_id INT NOT NULL PRIMARY KEY,
    athlete_id BIGINT NOT NULL,
    athlete_nom VARCHAR(120) NOT NULL DEFAULT '',
    access_token TEXT NOT NULL,          -- chiffré (AES-GCM)
    refresh_token TEXT NOT NULL,         -- chiffré (AES-GCM)
    expires_at DATETIME NOT NULL,
    scope VARCHAR(120) NOT NULL DEFAULT '',
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_strava_athlete (athlete_id),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
