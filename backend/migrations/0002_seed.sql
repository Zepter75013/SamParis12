SET NAMES utf8mb4;

-- Contenu d'exemple à remplacer par le contenu réel du club.

INSERT INTO training_groups (name, slug, age_range, level, schedule, coach, description, image, sort_order) VALUES
('École d''athlétisme', 'ecole-athletisme', '6-10 ans', 'Découverte', 'Mercredi 14h-15h30, Samedi 10h-11h30', 'À compléter', 'Découverte ludique de l''athlétisme : courir, sauter, lancer. Premiers pas vers la compétition en toute bienveillance.', '', 1),
('Poussins / Benjamins', 'poussins-benjamins', '10-13 ans', 'Perfectionnement', 'Mardi et jeudi 17h30-19h', 'À compléter', 'Apprentissage technique sur toutes les disciplines et premières compétitions départementales.', '', 2),
('Minimes / Cadets', 'minimes-cadets', '13-17 ans', 'Compétition', 'Lundi, mercredi, vendredi 18h-19h30', 'À compléter', 'Spécialisation progressive et préparation aux compétitions régionales et nationales.', '', 3),
('Athlètes seniors', 'seniors', '18 ans et +', 'Compétition', 'Selon planning individualisé', 'À compléter', 'Entraînement individualisé pour les athlètes engagés en compétition FFA.', '', 4),
('Loisir & running', 'loisir-running', 'Adultes', 'Loisir', 'Mardi et jeudi 19h-20h30', 'À compléter', 'Pratique conviviale de la course à pied et du fitness athlétique, pour tous les niveaux.', '', 5);

INSERT INTO news (title, slug, excerpt, content, cover_image, published_at) VALUES
('Bienvenue sur le nouveau site du SAM Paris 12', 'bienvenue-nouveau-site', 'Le club fait peau neuve avec un site moderne, responsive et bientôt installable comme une application.', 'Le SAM Paris 12 est heureux de vous présenter son nouveau site internet. Plus rapide, plus lisible sur mobile, il a été pensé pour vous donner facilement accès aux actualités, au calendrier des compétitions et aux informations sur nos sections.\n\nCe contenu est un exemple : il sera remplacé par les actualités réelles du club.', '', NOW()),
('Reprise des entraînements', 'reprise-des-entrainements', 'Toutes les sections reprennent le chemin de la piste pour une nouvelle saison.', 'Détail à compléter : dates de reprise par section, modalités d''inscription et documents à fournir (certificat médical, licence FFA).', '', NOW() - INTERVAL 7 DAY);

INSERT INTO events (title, description, location, category, start_at, end_at) VALUES
('Cross départemental', 'Compétition ouverte à toutes les catégories, de l''école d''athlétisme aux seniors.', 'Bois de Vincennes, Paris', 'Compétition', DATE_ADD(NOW(), INTERVAL 14 DAY), NULL),
('Journée portes ouvertes', 'Venez découvrir le club, rencontrer les entraîneurs et essayer une séance gratuite.', 'Stade du club, Paris 12e', 'Club', DATE_ADD(NOW(), INTERVAL 30 DAY), NULL),
('Meeting en salle', 'Réunion d''athlétisme en salle, toutes catégories.', 'Halle d''athlétisme, Paris', 'Compétition', DATE_ADD(NOW(), INTERVAL 45 DAY), NULL);

INSERT INTO partners (name, logo_url, website_url, sort_order) VALUES
('Team Outdoor', '', 'http://www.team-outdoor.fr/', 1);
