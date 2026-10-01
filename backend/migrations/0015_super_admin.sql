SET NAMES utf8mb4;

-- Rôle SuperAdmin : seul-e à pouvoir modifier les fonctionnalités (droits
-- droit_admin_evenements / droit_upload_documents / droit_saisie_resultats
-- et le statut SuperAdmin lui-même) via l'écran Fonctionnalités. Les autres
-- membres du bureau n'ont plus ce droit, même si is_bureau = TRUE.
ALTER TABLE members
    ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE AFTER is_bureau;

-- Amorçage : sans ça, personne ne pourrait jamais devenir SuperAdmin.
UPDATE members SET is_super_admin = TRUE WHERE email = 'laurentattal@free.fr';
