SET NAMES utf8mb4;

-- "Informations visibles des autres adhérents" : une catégorie distincte des
-- informations confidentielles (adresse légale, tél. domicile, urgence...),
-- que l'adhérent renseigne lui-même et qui s'affiche dans le trombinoscope.
ALTER TABLE members
    ADD COLUMN trombi_habite VARCHAR(255) NOT NULL DEFAULT '' AFTER photo_path,
    ADD COLUMN trombi_naissance VARCHAR(100) NOT NULL DEFAULT '' AFTER trombi_habite,
    ADD COLUMN trombi_origine VARCHAR(150) NOT NULL DEFAULT '' AFTER trombi_naissance,
    ADD COLUMN trombi_email VARCHAR(255) NOT NULL DEFAULT '' AFTER trombi_origine,
    ADD COLUMN trombi_telephone VARCHAR(20) NOT NULL DEFAULT '' AFTER trombi_email,
    ADD COLUMN trombi_profession VARCHAR(150) NOT NULL DEFAULT '' AFTER trombi_telephone,
    ADD COLUMN trombi_employeur VARCHAR(150) NOT NULL DEFAULT '' AFTER trombi_profession,
    ADD COLUMN trombi_distance_favorite VARCHAR(100) NOT NULL DEFAULT '' AFTER trombi_employeur,
    ADD COLUMN trombi_bio TEXT NOT NULL AFTER trombi_distance_favorite;
