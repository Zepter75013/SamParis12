-- Pré-remplissage OPTIONNEL du champ « Sexe » des adhérents d'après leur prénom (à lancer à la main, jamais automatiquement).
--
-- Ne touche que les adhérents dont le sexe n'est pas renseigné (sexe = ''). Seuls des prénoms courants et non ambigus
-- sont reconnus ; les prénoms mixtes (Camille, Dominique, Claude, Charlie, Sacha, Alex, Morgan, Robin…) et tous les
-- prénoms inconnus restent « non renseigné ». C'est une aide, pas une vérité : relire le résultat (requête de contrôle
-- en bas) et corriger dans la fiche adhérent (Admin Club > fiche > Sexe) les erreurs éventuelles.
--
-- Usage : source /tmp/prefill_sexe_depuis_prenom.sql;

SET NAMES utf8mb4;

UPDATE members SET sexe = 'F' WHERE sexe = '' AND prenom IN ('Marie','Sophie','Nathalie','Isabelle','Catherine','Julie','Sylvie','Claire','Anne','Céline','Christine','Françoise','Monique','Martine','Valérie','Véronique','Sandrine','Stéphanie','Laurence','Florence','Hélène','Brigitte','Patricia','Corinne','Annie','Nicole','Jacqueline','Christelle','Aurélie','Émilie','Emilie','Amélie','Laetitia','Élodie','Elodie','Delphine','Virginie','Karine','Sabrina','Audrey','Caroline','Charlotte','Laure','Pauline','Marine','Sarah','Léa','Lea','Manon','Chloé','Chloe','Emma','Inès','Ines','Jeanne','Louise','Alice','Julia','Margaux','Mathilde','Océane','Clara','Lucie','Agnès','Agnes','Béatrice','Béatrix','Cécile','Colette','Danielle','Denise','Édith','Edith','Éliane','Eliane','Evelyne','Éveline','Fabienne','Geneviève','Genevieve','Ghislaine','Gisèle','Josiane','Joëlle','Joelle','Lydie','Magali','Marianne','Maryse','Michèle','Michele','Mireille','Muriel','Nadine','Odile','Pascale','Sonia','Sylviane','Thérèse','Therese','Yvette','Yvonne','Zoé','Zoe','Fatima','Samira','Nadia','Leïla','Leila','Yasmine','Aïcha','Aicha','Amina','Rachida','Malika','Maria','Ana','Rosa','Elena','Giulia','Laura','Paula','Carla','Sofia','Isabel','Eva','Lina','Nina','Nora','Ève','Eve','Anaïs','Anais','Estelle','Gaëlle','Gaelle','Jessica','Justine','Lisa','Mélanie','Melanie','Morgane','Noémie','Noemie','Priscilla','Romane','Solène','Solene','Typhaine','Vanessa','Violette');

UPDATE members SET sexe = 'H' WHERE sexe = '' AND prenom IN ('Jean','Pierre','Philippe','Michel','Thomas','Nicolas','Laurent','David','Alain','André','Andre','Antoine','Arnaud','Benoît','Benoit','Bernard','Bruno','Christian','Christophe','Daniel','Denis','Didier','Éric','Eric','Étienne','Etienne','Fabien','Fabrice','François','Francois','Frédéric','Frederic','Gérard','Gerard','Gilles','Guillaume','Henri','Hervé','Herve','Jacques','Jérôme','Jerome','Joël','Joel','Julien','Loïc','Loic','Luc','Marc','Mathieu','Olivier','Patrice','Patrick','Paul','Pascal','Rémi','Remi','René','Rene','Richard','Robert','Roland','Sébastien','Sebastien','Serge','Stéphane','Stephane','Sylvain','Thierry','Vincent','Xavier','Yann','Yves','Alexandre','Adrien','Arthur','Baptiste','Clément','Clement','Damien','Édouard','Edouard','Émile','Emile','Florent','Gabriel','Hugo','Jules','Kévin','Kevin','Léo','Leo','Louis','Lucas','Mathis','Nathan','Noah','Raphaël','Raphael','Romain','Samuel','Simon','Théo','Theo','Tristan','Valentin','Victor','Antonio','Carlos','Jose','José','Manuel','Miguel','Pedro','Luis','Mohamed','Karim','Rachid','Ahmed','Youssef','Omar','Mehdi','Hassan','Ali','Farid','Samir','Marco','Giovanni','Luca','Paolo','Joao','João');

-- Contrôle : répartition obtenue, puis les adhérents toujours non renseignés (à compléter à la main).
SELECT sexe, COUNT(*) AS nombre FROM members GROUP BY sexe;
SELECT id, prenom, nom, groupe FROM members WHERE sexe = '' ORDER BY nom, prenom;
