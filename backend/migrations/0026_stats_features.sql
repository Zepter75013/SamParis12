SET NAMES utf8mb4;

-- Écran Statistiques : trois fonctionnalités (stats.effectifs, stats.courses, stats.engagement), accordées par défaut
-- aux rôles du bureau (le Super administrateur a déjà toutes les fonctionnalités). Le rôle Adhérent n'en reçoit aucune :
-- il ne voit pas l'écran. Les droits se modifient ensuite dans l'écran « Rôles et droits ».
-- Cette migration peut être relancée sans erreur ; une fois que des rôles ont des fonctionnalités « stats.* », elle ne
-- change plus rien (elle ne remet donc pas un droit que l'administrateur a retiré).
INSERT INTO app_role_features (role_id, feature)
SELECT r.id, f.feature
FROM app_roles r
JOIN (SELECT 'stats.effectifs' AS feature UNION ALL SELECT 'stats.courses' UNION ALL SELECT 'stats.engagement') f
WHERE r.est_bureau = 1 AND r.est_super = 0
  AND NOT EXISTS (SELECT 1 FROM app_role_features x WHERE x.feature LIKE 'stats.%');
