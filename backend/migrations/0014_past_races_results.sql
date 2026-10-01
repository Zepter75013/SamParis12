SET NAMES utf8mb4;

-- Génère des résultats (temps, classement général, catégorie, classement
-- catégorie) plausibles pour les adhérents inscrits (race_registrations) sur
-- les 190 courses importées dans 0012_past_races.sql -- à exécuter après
-- 0013_past_races_registrations.sql, dont il dépend.
DROP PROCEDURE IF EXISTS tmp_seed_race_results;
DELIMITER //
CREATE PROCEDURE tmp_seed_race_results()
BEGIN
  DECLARE done_race INT DEFAULT 0;
  DECLARE r_id INT;
  DECLARE r_distance DECIMAL(6,2);
  DECLARE cur_races CURSOR FOR
    SELECT r.id, r.distance_km FROM races r
    WHERE (r.titre, r.race_date) IN (
      ('10Km Tours', '2026-09-27'),
      ('20km de Tours', '2026-09-27'),
      ('Course des Terrils : La Furtive', '2026-09-27'),
      ('Course du souffle - Virade de l''espoir - Sceaux 10 km', '2026-09-27'),
      ('Course du souffle - Virade de l''espoir - Sceaux 5km', '2026-09-27'),
      ('Foulée de l''immobilier', '2026-09-27'),
      ('La Levalloisienne - 10km', '2026-09-27'),
      ('La Levalloisienne - 5km', '2026-09-27'),
      ('Le Semi-Marathon de Rouen', '2026-09-27'),
      ('Les Foulées Des 4 Portes - semi', '2026-09-27'),
      ('Marathon de Berlin', '2026-09-27'),
      ('Marathon de Tours', '2026-09-27'),
      ('Paris Versailles', '2026-09-27'),
      ('Semi du Lion', '2026-09-27'),
      ('Semi Marathon d''Avignon', '2026-09-27'),
      ('Semi marathon de la bière de Flandre', '2026-09-27'),
      ('Semi-Marathon des Ecluses de la Mayenne', '2026-09-27'),
      ('Trail du Mont Sarrazin - La Tortue', '2026-09-27'),
      ('Trail du Petit Saint Bernard - 68km', '2026-09-27'),
      ('Virade de Paris', '2026-09-27'),
      ('100 kms de Millau', '2026-09-26'),
      ('LE 10KM DE ROUEN', '2026-09-26'),
      ('Trail du Grand Colombier - 30km', '2026-09-26'),
      ('Trail du Petit Saint Bernard - 21km', '2026-09-26'),
      ('Trail Nice UTMB - 50K', '2026-09-26'),
      ('Ultra Trail du Grand Colombier - 120km', '2026-09-26'),
      ('X Trail Corrèze Dordogne - 14km', '2026-09-26'),
      ('Yes We Run Courbevoie - 10km', '2026-09-26'),
      ('5 Km de la ligue d''IDF d''athlétisme / F Toutes catégories', '2026-09-20'),
      ('5 Km de la ligue d''IDF d''athlétisme / H Juniors, Espoirs, Seniors et M', '2026-09-20'),
      ('5 Km de la ligue d''IDF d''athlétisme / H Minimes, Cadets et Master 1 et', '2026-09-20'),
      ('Copenhagen Half Marathon', '2026-09-20'),
      ('Duathlon L Ventouxman', '2026-09-20'),
      ('La ronde cérétane', '2026-09-20'),
      ('La Ronde de Crussol - La Ronde 15K - Duo', '2026-09-20'),
      ('Les 21 kms Mer, Monts et Marais - 5 km Marais de Villers-Blonville', '2026-09-20'),
      ('Les 21 kms Mer, Monts et Marais - Les 12km de Blonville sur Mer', '2026-09-20'),
      ('Les Foulées du Pont', '2026-09-20'),
      ('MEMORUN - 10km', '2026-09-20'),
      ('Semi Marathon de Colmar', '2026-09-20'),
      ('ZOO RUN', '2026-09-20'),
      ('Grand Trail de Serre Ponçon - 30km', '2026-09-19'),
      ('Grand Trail de Serre Ponçon - 60km', '2026-09-19'),
      ('Trail du Tetras Lyre - 37K', '2026-09-19'),
      ('10 km Roissy en Brie', '2026-09-13'),
      ('A saute clocher', '2026-09-13'),
      ('Auray-Vannes', '2026-09-13'),
      ('Course Eiffage du Viaduc de Millau en Aveyron - 23km', '2026-09-13'),
      ('L''Infernal Trail des Vosges - IT15', '2026-09-13'),
      ('LA PARISIENNE', '2026-09-13'),
      ('Trail de la côte d''Emeraude - 32km', '2026-09-13'),
      ('Trail du chêne fourchu', '2026-09-13'),
      ('Trail National Côte d''Opale en Pas de Calais 2026', '2026-09-13'),
      ('Impérial Trail Fontainebleau', '2026-09-12'),
      ('L''Infernal Trail des Vosges - IT50', '2026-09-12'),
      ('Marath''bleau', '2026-09-12'),
      ('Trail des vendanges', '2026-09-12'),
      ('10KM HEXAGONE-TROCADÉRO', '2026-09-06'),
      ('Course de la rentrée 15km', '2026-09-06'),
      ('Course de la rentrée 5km', '2026-09-06'),
      ('Triathlon de Gérardmer - XL', '2026-09-05'),
      ('Swiss Peak 100 miles', '2026-09-03'),
      ('Swiss peak ultra 100km', '2026-09-03'),
      ('Les Foulées du Grand Cerf', '2026-08-30'),
      ('MICI On Bellebouche', '2026-08-30'),
      ('Foulées Gouvillaises', '2026-08-29'),
      ('CCC', '2026-08-28'),
      ('TDS', '2026-08-24'),
      ('Landirun Seignosse', '2026-08-23'),
      ('Semi-marathon Cancale - St Malo', '2026-08-23'),
      ('Tour du Lac - Crêtes Vosgiennes', '2026-08-23'),
      ('Trail de Loir''Espoir Athlé - 10km', '2026-08-23'),
      ('Trail de Loir''Espoir Athlé - 20km', '2026-08-23'),
      ('trail des aiguilles d''arves', '2026-08-23'),
      ('Trail des Crêtes Vosgiennes', '2026-08-23'),
      ('Trail du Galibier - Thabor', '2026-08-22'),
      ('Grand Raid des Pyrénées', '2026-08-21'),
      ('5km d''Hirel', '2026-08-09'),
      ('Sierre-Zinal - Classement Hommes', '2026-08-08'),
      ('Ascension de la cime de la Bonette', '2026-07-26'),
      ('MONTREUX TRAIL FESTIVAL', '2026-07-25'),
      ('15KM des Battages', '2026-07-19'),
      ('Maratrail des passerelles - 40km', '2026-07-12'),
      ('10 km GSC Run Set & Match', '2026-07-05'),
      ('Semi-Marathon du Mont Ventoux', '2026-07-05'),
      ('23km du Mont-Blanc', '2026-06-28'),
      ('42km du Mont-Blanc', '2026-06-28'),
      ('Semi-Marathon de Phalempin', '2026-06-21'),
      ('Triathlon de Deauville DO750', '2026-06-21'),
      ('10 km du Plessis-Trévise', '2026-06-14'),
      ('Foulées du 12ème - 10km', '2026-06-14'),
      ('Foulées du 12ème - 5km', '2026-06-14'),
      ('Les Foulées du 12ème - 10km', '2026-06-14'),
      ('Les Foulées du 12ème - 5km', '2026-06-14'),
      ('10K Adidas', '2026-06-07'),
      ('Dynamorun - 15Miles', '2026-06-07'),
      ('10 km du Neuf', '2026-05-31'),
      ('Foulées Pantinoises', '2026-05-31'),
      ('LH Urban Trail - Semi Marathon', '2026-05-31'),
      ('La Maisonnaise - 10km', '2026-05-24'),
      ('La Pyrénéenne', '2026-05-24'),
      ('Montée du Ventoux', '2026-05-24'),
      ('10KM Paris 15', '2026-05-17'),
      ('Semi-Marathon des Alpes - Bourg St Maurice', '2026-05-17'),
      ('MARATHON HELSINKI', '2026-05-16'),
      ('Championnat de France 100 km', '2026-05-14'),
      ('10km Courses solidaires au profit du Bleuet de France', '2026-05-10'),
      ('La Cacienne', '2026-05-10'),
      ('Marathon de la Loire', '2026-05-10'),
      ('Paris/St Germain la course', '2026-05-10'),
      ('Course du Sanglier', '2026-05-08'),
      ('5 km Pontault-Combault', '2026-05-03'),
      ('Marathon des 2 Rives', '2026-05-03'),
      ('Semi marathon des 2 rives', '2026-05-03'),
      ('course du muguet - 10 km de Pontoise', '2026-05-01'),
      ('Les runs de Senart', '2026-05-01'),
      ('Foulées Mussipontaines 10km', '2026-04-26'),
      ('Marathon d''Albi', '2026-04-26'),
      ('Marathon de Hambourg', '2026-04-26'),
      ('Marathon de Londres', '2026-04-26'),
      ('Marathon de Nantes', '2026-04-26'),
      ('Boston Marathon 2026', '2026-04-20'),
      ('Marathon du Lac d''Annecy', '2026-04-19'),
      ('Semi marathon de Nice', '2026-04-19'),
      ('10 Km de Joinville', '2026-04-12'),
      ('Marathon de Chinon', '2026-04-12'),
      ('Marathon de Paris', '2026-04-12'),
      ('Semi-Marathon de Joinville', '2026-04-12'),
      ('10km du Bois de Boulogne', '2026-04-05'),
      ('La Grande Course - Semi Marathon', '2026-04-05'),
      ('10km d''Aix-les-Bains', '2026-03-29'),
      ('Semi de Berlin', '2026-03-29'),
      ('Semi-marathon Villepinte "À vos baskets"', '2026-03-29'),
      ('Marathon des vins de la côte Chalonnaise', '2026-03-28'),
      ('10km de Feurs', '2026-03-22'),
      ('EcoTrail Paris - Trail 10km', '2026-03-22'),
      ('Marathon de Rome', '2026-03-22'),
      ('Semi marathon de Saint-Witz', '2026-03-21'),
      ('Marathon de Barcelone', '2026-03-15'),
      ('Semi de Malaga', '2026-03-15'),
      ('Semi-marathon de Chartres', '2026-03-08'),
      ('Semi-marathon de Paris', '2026-03-08'),
      ('10k de Carquefou', '2026-03-01'),
      ('Tokyo Women''s Marathon', '2026-03-01'),
      ('Le Semi de Cannes - 21km', '2026-02-22'),
      ('50e Cross de la ville de Sceaux - 10km', '2026-02-15'),
      ('Marathon De Seville', '2026-02-15'),
      ('Course de la Saint-Valentin - 10km Solo', '2026-02-14'),
      ('Les Foulées de Vincennes - 10km Compétition', '2026-02-08'),
      ('Foulées de Malakoff - 10 kms', '2026-02-07'),
      ('10km CHAMPS-ÉLYSÉES', '2026-02-01'),
      ('Semi marathon de Marrakech', '2026-01-25'),
      ('10 km du 14ème', '2026-01-18'),
      ('10km de Montmartre', '2026-01-18'),
      ('1er challenge sur route de France 2026 - Semi', '2026-01-04'),
      ('Corrida d''Arnage - 10km', '2026-01-04'),
      ('Corrida de la St Sylvestre', '2025-12-29'),
      ('Corrida de Houilles - 10km Populaire', '2025-12-21'),
      ('Corrida de Noël d''Issy-les-Moulineaux - 10km', '2025-12-14'),
      ('Run for climate - 10km', '2025-12-14'),
      ('10km de la tour Eiffel', '2025-12-07'),
      ('La Corrida de Thiais - 10km', '2025-12-07'),
      ('10 km de la St Nicolas', '2025-11-30'),
      ('Marathon de La Rochelle', '2025-11-30'),
      ('10KM HOKA PARIS CENTRE', '2025-11-16'),
      ('Semi-Marathon Boulogne', '2025-11-16'),
      ('10km DEAUVILLE', '2025-11-15'),
      ('20km Behobia - San Sebastian', '2025-11-09'),
      ('Semi marathon de Bordeaux', '2025-11-09'),
      ('Marathon de New York', '2025-11-02'),
      ('Marathon de Francfort', '2025-10-26'),
      ('10 Km Paris 15', '2025-10-19'),
      ('Marathon d''Amsterdam', '2025-10-19'),
      ('Semi Marathon du Bois de Vincennes', '2025-10-19'),
      ('20km de Paris', '2025-10-12'),
      ('Chicago Marathon', '2025-10-12'),
      ('Corrida Villejuif - 10km', '2025-10-05'),
      ('Run in Lyon - 10 kms', '2025-10-05'),
      ('10km de Tours', '2025-09-28'),
      ('Paris-Versailles', '2025-09-28'),
      ('Marathon de Berlin', '2025-09-21'),
      ('La Parisienne', '2025-09-14'),
      ('10km du Trocadéro', '2025-08-31'),
      ('Ultra Trail du Mont Blanc - UTMB', '2025-08-29'),
      ('10 km Adidas Paris', '2025-06-08'),
      ('Paris Saint Germain La Course', '2025-05-18'),
      ('TCS LONDON MARATHON', '2025-04-27'),
      ('Marathon de BOSTON', '2025-04-21'),
      ('Marathon de Paris', '2025-04-13'),
      ('Marathon de Rotterdam', '2025-04-13')
    );
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_race = 1;

  OPEN cur_races;
  race_loop: LOOP
    FETCH cur_races INTO r_id, r_distance;
    IF done_race THEN LEAVE race_loop; END IF;

    BEGIN
      DECLARE done_member INT DEFAULT 0;
      DECLARE m_id INT;
      DECLARE i INT DEFAULT 0;
      DECLARE participant_count INT DEFAULT 0;
      DECLARE total_general INT DEFAULT 0;
      DECLARE offset_general INT DEFAULT 0;
      DECLARE pace DECIMAL(6,2);
      DECLARE temps INT;
      DECLARE cat VARCHAR(10);
      DECLARE cat_total INT;
      DECLARE cat_rank INT;
      DECLARE cur_members CURSOR FOR
        SELECT member_id FROM race_registrations WHERE race_id = r_id ORDER BY RAND();
      DECLARE CONTINUE HANDLER FOR NOT FOUND SET done_member = 1;

      SELECT COUNT(*) INTO participant_count FROM race_registrations WHERE race_id = r_id;

      IF participant_count > 0 THEN
        SET total_general = participant_count + 40 + FLOOR(RAND() * 800);
        SET offset_general = FLOOR(RAND() * (total_general - participant_count));

        OPEN cur_members;
        member_loop: LOOP
          FETCH cur_members INTO m_id;
          IF done_member THEN LEAVE member_loop; END IF;
          SET i = i + 1;

          IF r_distance > 0 THEN
            SET pace = 4.3 + (i - 1) * 0.18 + (RAND() * 0.4);
            SET temps = ROUND(r_distance * pace * 60);
          ELSE
            SET temps = 1200 + FLOOR(RAND() * 13800);
          END IF;

          SET cat = ELT(1 + FLOOR(RAND() * 10), 'SEH','SEF','M0H','M0F','M1H','M1F','M2H','M2F','M3H','M3F');
          SET cat_total = 15 + FLOOR(RAND() * 120);
          SET cat_rank = LEAST(cat_total, GREATEST(1, FLOOR(i * (cat_total / participant_count)) + FLOOR(RAND() * 3) - 1));

          INSERT INTO race_results (
            race_id, member_id, temps_secondes, classement_general, classement_general_total,
            categorie, classement_categorie, classement_categorie_total, created_by
          ) VALUES (
            r_id, m_id, temps, offset_general + i, total_general,
            cat, cat_rank, cat_total, (SELECT id FROM members WHERE email = 'laurentattal@free.fr')
          ) ON DUPLICATE KEY UPDATE
            temps_secondes = VALUES(temps_secondes),
            classement_general = VALUES(classement_general),
            classement_general_total = VALUES(classement_general_total),
            categorie = VALUES(categorie),
            classement_categorie = VALUES(classement_categorie),
            classement_categorie_total = VALUES(classement_categorie_total);
        END LOOP;
        CLOSE cur_members;
      END IF;
    END;

  END LOOP;
  CLOSE cur_races;
END //
DELIMITER ;
CALL tmp_seed_race_results();
DROP PROCEDURE tmp_seed_race_results;
