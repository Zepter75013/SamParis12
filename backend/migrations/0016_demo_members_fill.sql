SET NAMES utf8mb4;

-- Renseigne des valeurs cohérentes pour les adhérents de démonstration
-- (demo.*@demo-samparis12.test) uniquement : les vrais comptes ne sont jamais touchés.
-- Déterministe : relancer le script redonne les mêmes valeurs (aléa dérivé par hachage MD5 de l'id de l'adhérent).
--
-- Cohérences : le groupe (Running / Marche Nordique Sportive / Marche Loisir) donne l'activité de la
-- saison et le type de licence ; l'âge dépend du groupe (marche : 52 à 79 ans) ; les adhésions
-- commencent après les 18 ans de l'adhérent ; la cotisation (120 €) n'est payée que par les
-- adhérents de la saison, à une date comprise entre le début de la saison et aujourd'hui ; la
-- VMA n'est renseignée que pour les coureurs et baisse avec l'âge ; la fiche trombinoscope
-- reprend les mêmes informations (ville, date et lieu de naissance, groupe, ancienneté).
-- Numéros de téléphone : plages fictives réservées (06 39 98 xx xx, 01 99 00 xx xx).

SET @season_end = YEAR(CURDATE()) + (MONTH(CURDATE()) >= 9);
SET @season_start = STR_TO_DATE(CONCAT(@season_end - 1, '-09-01'), '%Y-%m-%d');
SET @days_since_start = GREATEST(DATEDIFF(CURDATE(), @season_start), 1);

UPDATE members SET
  groupe = (@g := IF((@r := (CONV(SUBSTRING(MD5(CONCAT(id, '#1')), 1, 8), 16, 10) / 4294967296)) < 0.86, 'Running', IF(@r < 0.95, 'Marche Nordique Sportive', 'Marche Loisir'))),
  activite_saison = @g,
  licence_ffa_type = IF(@g = 'Running', 'Athlé Running', 'Athlé Santé Loisir'),
  statut = (@s := IF((@r := (CONV(SUBSTRING(MD5(CONCAT(id, '#2')), 1, 8), 16, 10) / 4294967296)) < 0.08, 'Anciens adhérents', IF(@r < 0.25, 'Nouveaux adhérents', CONCAT('Adhérents ', @season_end)))),
  date_naissance = DATE_SUB(
    DATE_SUB(CURDATE(), INTERVAL (@age := IF(@g = 'Running',
        18 + FLOOR(57 * POW(((CONV(SUBSTRING(MD5(CONCAT(id, '#3')), 1, 8), 16, 10) / 4294967296) + (CONV(SUBSTRING(MD5(CONCAT(id, '#4')), 1, 8), 16, 10) / 4294967296)) / 2, 1.2)),
        52 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#3')), 1, 8), 16, 10) / 4294967296) * 28))) YEAR),
    INTERVAL FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#5')), 1, 8), 16, 10) / 4294967296) * 364) DAY),
  lieu_naissance = ELT(1 + FLOOR(POW((CONV(SUBSTRING(MD5(CONCAT(id, '#6')), 1, 8), 16, 10) / 4294967296), 1.6) * 18), 'Paris','Paris','Lyon','Marseille','Lille','Toulouse','Nantes','Bordeaux','Strasbourg','Rennes','Montpellier','Nice','Grenoble','Dijon','Reims','Tours','Clermont-Ferrand','Brest'),
  nationalite = IF((CONV(SUBSTRING(MD5(CONCAT(id, '#7')), 1, 8), 16, 10) / 4294967296) < 0.9, 'Française', ELT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#8')), 1, 8), 16, 10) / 4294967296) * 6), 'Portugaise','Italienne','Espagnole','Marocaine','Algérienne','Britannique')),
  code_postal = ELT((@c := 1 + FLOOR(POW((CONV(SUBSTRING(MD5(CONCAT(id, '#9')), 1, 8), 16, 10) / 4294967296), 2.2) * 12)), '75012','75011','94300','94160','94220','75020','94130','75013','94410','75014','92120','94120'),
  ville = ELT(@c, 'Paris','Paris','Vincennes','Saint-Mandé','Charenton-le-Pont','Paris','Nogent-sur-Marne','Paris','Saint-Maurice','Paris','Montrouge','Fontenay-sous-Bois'),
  adresse = CONCAT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#10')), 1, 8), 16, 10) / 4294967296) * 98), ' ', ELT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#11')), 1, 8), 16, 10) / 4294967296) * 12), 'rue de la République', 'avenue du Général de Gaulle', 'rue Victor Hugo', 'rue Jean Jaurès', 'avenue de la Liberté', 'rue Pasteur', 'rue des Écoles', 'boulevard Voltaire', 'rue Gambetta', 'rue du Commerce', 'rue de Paris', 'avenue de la Gare')),
  telephone_portable = CONCAT('06 39 98 ', LPAD(FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#12')), 1, 8), 16, 10) / 4294967296) * 100), 2, '0'), ' ', LPAD(FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#13')), 1, 8), 16, 10) / 4294967296) * 100), 2, '0')),
  telephone_domicile = IF((CONV(SUBSTRING(MD5(CONCAT(id, '#14')), 1, 8), 16, 10) / 4294967296) < 0.25, CONCAT('01 99 00 ', LPAD(FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#15')), 1, 8), 16, 10) / 4294967296) * 100), 2, '0'), ' ', LPAD(FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#16')), 1, 8), 16, 10) / 4294967296) * 100), 2, '0')), ''),
  urgence_nom = CONCAT(ELT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#17')), 1, 8), 16, 10) / 4294967296) * 16), 'Marie', 'Jean', 'Pierre', 'Sophie', 'Nathalie', 'Philippe', 'Isabelle', 'Michel', 'Catherine', 'Thomas', 'Julie', 'Nicolas', 'Sylvie', 'Laurent', 'Claire', 'David'), ' ', nom),
  urgence_telephone = CONCAT('06 39 98 ', LPAD(FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#18')), 1, 8), 16, 10) / 4294967296) * 100), 2, '0'), ' ', LPAD(FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#19')), 1, 8), 16, 10) / 4294967296) * 100), 2, '0')),
  taille_maillot = IF((@r := (CONV(SUBSTRING(MD5(CONCAT(id, '#20')), 1, 8), 16, 10) / 4294967296)) < 0.05, 'XS', IF(@r < 0.30, 'S', IF(@r < 0.65, 'M', IF(@r < 0.88, 'L', IF(@r < 0.97, 'XL', 'XXL'))))),
  vma = IF(@g = 'Running', GREATEST(11.0, LEAST(20.0, ROUND(18.6 - (@age - 20) * 0.08 + ((CONV(SUBSTRING(MD5(CONCAT(id, '#21')), 1, 8), 16, 10) / 4294967296) - 0.5) * 3.2, 1))), NULL),
  vma_date = IF(vma IS NULL, NULL, DATE_SUB(CURDATE(), INTERVAL FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#22')), 1, 8), 16, 10) / 4294967296) * 330) DAY)),
  numero_licence = CAST(FLOOR(1000000 + (CONV(SUBSTRING(MD5(CONCAT(id, '#23')), 1, 8), 16, 10) / 4294967296) * 8999999) AS CHAR),
  licencie_par = 'SAM Paris 12',
  origine_contact = ELT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#24')), 1, 8), 16, 10) / 4294967296) * 7), 'Bouche à oreille','Site internet','Forum des associations','Réseaux sociaux','Famille ou amis','Entreprise','Autre'),
  annee_derniere_adhesion = IF(@s = 'Anciens adhérents', @season_end - 1, @season_end),
  annee_premiere_adhesion = (@fa := IF(@s = 'Nouveaux adhérents', @season_end,
      annee_derniere_adhesion - IF(@s = 'Anciens adhérents', 0, 1) - FLOOR(POW((CONV(SUBSTRING(MD5(CONCAT(id, '#25')), 1, 8), 16, 10) / 4294967296), 1.5) * LEAST(20, GREATEST(@age - 18, 1))))),
  date_premiere_adhesion = LEAST(STR_TO_DATE(CONCAT(@fa - 1, '-09-', LPAD(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#26')), 1, 8), 16, 10) / 4294967296) * 28), 2, '0')), '%Y-%m-%d'), CURDATE()),
  date_dernier_certificat = IF(@fa <= @season_end - 3, DATE_SUB(CURDATE(), INTERVAL FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#27')), 1, 8), 16, 10) / 4294967296) * 900) DAY), NULL),
  montant_cotisation = IF(@s = 'Anciens adhérents', NULL, 120.00),
  date_paiement_cotisation = IF(@s = 'Anciens adhérents', NULL, DATE_ADD(@season_start, INTERVAL FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#28')), 1, 8), 16, 10) / 4294967296) * @days_since_start) DAY)),
  mode_paiement = IF(@s = 'Anciens adhérents', '', IF((@r := (CONV(SUBSTRING(MD5(CONCAT(id, '#29')), 1, 8), 16, 10) / 4294967296)) < 0.7, 'Carte bancaire', IF(@r < 0.85, 'Virement', 'Chèque'))),
  trombi_habite = CONCAT('à ', IF(code_postal LIKE '750%', CONCAT('Paris ', CAST(CAST(SUBSTRING(code_postal, 4, 2) AS UNSIGNED) AS CHAR), 'e'), ville)),
  trombi_naissance = CONCAT(DAY(date_naissance), ' ', ELT(MONTH(date_naissance), 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'), ' ', YEAR(date_naissance)),
  trombi_origine = lieu_naissance,
  trombi_email = IF((CONV(SUBSTRING(MD5(CONCAT(id, '#30')), 1, 8), 16, 10) / 4294967296) < 0.4, email, ''),
  trombi_telephone = IF((CONV(SUBSTRING(MD5(CONCAT(id, '#31')), 1, 8), 16, 10) / 4294967296) < 0.3, telephone_portable, ''),
  trombi_profession = IF(@age >= 63, 'Retraité(e)', ELT((@k := 1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#32')), 1, 8), 16, 10) / 4294967296) * 14)), 'Ingénieur(e)', 'Infirmier(ère)', 'Enseignant(e)', 'Comptable', 'Développeur(se)', 'Médecin', 'Consultant(e)', 'Architecte', 'Chargé(e) de communication', 'Juriste', 'Cadre bancaire', 'Chef(fe) de projet', 'Artisan', 'Responsable RH')),
  trombi_employeur = IF(@age >= 63, '', ELT(@k, 'Bureau d''études', 'Hôpital public', 'Éducation nationale', 'Cabinet d''expertise comptable', 'Éditeur de logiciels', 'Cabinet médical', 'Cabinet de conseil', 'Agence d''architecture', 'Agence de communication', 'Cabinet d''avocats', 'Banque', 'Groupe industriel', 'Indépendant', 'Grande entreprise')),
  trombi_distance_favorite = IF(@g = 'Running', ELT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#33')), 1, 8), 16, 10) / 4294967296) * 6), '5 km','10 km','10 km','Semi-marathon','Marathon','Trail'), 'Marche nordique'),
  trombi_bio = CONCAT('À la SAM depuis ', @fa - 1, '. ',
      IF(@g = 'Running', CONCAT('Je cours ', 2 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#34')), 1, 8), 16, 10) / 4294967296) * 3), ' fois par semaine, ma distance préférée : ', trombi_distance_favorite, '. '),
         'Je pratique la marche pour le plaisir et la santé. '),
      ELT(1 + FLOOR((CONV(SUBSTRING(MD5(CONCAT(id, '#35')), 1, 8), 16, 10) / 4294967296) * 5), 'Toujours partant pour un café après la séance.', 'Objectif de la saison : progresser sans me blesser.', 'À la recherche de partenaires pour les sorties longues du week-end.', 'Fan des séances de fractionné sur la piste.', 'Ravi de partager des covoiturages pour les courses.'))
WHERE email LIKE 'demo.%@demo-samparis12.test';

-- Contrôle rapide (lecture seule)
SELECT groupe, statut, COUNT(*) AS nombre, MIN(TIMESTAMPDIFF(YEAR, date_naissance, CURDATE())) AS age_min,
       MAX(TIMESTAMPDIFF(YEAR, date_naissance, CURDATE())) AS age_max
FROM members WHERE email LIKE 'demo.%@demo-samparis12.test' GROUP BY groupe, statut ORDER BY groupe, statut;
