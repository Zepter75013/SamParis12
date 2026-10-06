// Package stats : statistiques du club, calculées à partir des données existantes (adhérents, courses, messagerie,
// jeu, journal d'activité). Trois sections, chacune réservée aux rôles qui ont la fonctionnalité correspondante
// (stats.effectifs, stats.courses, stats.engagement) ; les contrôles d'accès sont faits par le routeur.
package stats

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"samparis12/backend/internal/httpx"
)

type Handler struct{ db *sql.DB }

func NewHandler(db *sql.DB) *Handler { return &Handler{db: db} }

// Count : une valeur d'un graphique (libellé + effectif).
type Count struct {
	Label string `json:"label"`
	N     int    `json:"n"`
}

func fail(w http.ResponseWriter, err error) {
	log.Printf("stats: %v", err)
	httpx.Error(w, http.StatusInternalServerError, "impossible de calculer les statistiques")
}

// counts exécute une requête « libellé, effectif ».
func (h *Handler) counts(query string, args ...any) ([]Count, error) {
	rows, err := h.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Count{}
	for rows.Next() {
		var c Count
		if err := rows.Scan(&c.Label, &c.N); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (h *Handler) one(query string, args ...any) (int, error) {
	var n sql.NullInt64
	err := h.db.QueryRow(query, args...).Scan(&n)
	return int(n.Int64), err
}

// ---------------------------------------------------------------------------------------------------------------------
// Effectifs
// ---------------------------------------------------------------------------------------------------------------------

type Effectifs struct {
	Total            int      `json:"total"`
	SaisonCourante   int      `json:"saisonCourante"` // dernière année d'adhésion enregistrée (0 : aucune)
	AJour            int      `json:"aJour"`          // adhérents dont la dernière adhésion est celle de la saison courante
	Nouveaux         int      `json:"nouveaux"`       // adhérents dont la première adhésion est celle de la saison courante
	AgeMoyen         *float64 `json:"ageMoyen"`
	Statuts          []Count  `json:"statuts"`
	Groupes          []Count  `json:"groupes"`
	Sexes            []Count  `json:"sexes"`
	Ages             []Count  `json:"ages"`
	PremiereAdhesion []Count  `json:"premiereAdhesion"`
	DerniereAdhesion []Count  `json:"derniereAdhesion"`
}

const nonRenseigne = "Non renseigné"

// Effectifs : répartition des adhérents (statut, groupe, sexe, âge) et historique des adhésions.
func (h *Handler) Effectifs(w http.ResponseWriter, r *http.Request) {
	var e Effectifs
	var err error
	step := func(f func() error) {
		if err == nil {
			err = f()
		}
	}
	step(func() (x error) {
		e.Total, x = h.one(`SELECT COUNT(*) FROM members`)
		return x
	})
	step(func() (x error) {
		var s sql.NullInt64
		x = h.db.QueryRow(`SELECT MAX(annee_derniere_adhesion) FROM members`).Scan(&s)
		e.SaisonCourante = int(s.Int64)
		return x
	})
	if e.SaisonCourante > 0 {
		step(func() (x error) {
			e.AJour, x = h.one(`SELECT COUNT(*) FROM members WHERE annee_derniere_adhesion = ?`, e.SaisonCourante)
			return x
		})
		step(func() (x error) {
			e.Nouveaux, x = h.one(`SELECT COUNT(*) FROM members WHERE annee_premiere_adhesion = ?`, e.SaisonCourante)
			return x
		})
	}
	step(func() (x error) {
		var a sql.NullFloat64
		x = h.db.QueryRow(`SELECT AVG(TIMESTAMPDIFF(YEAR, date_naissance, CURDATE())) FROM members WHERE date_naissance IS NOT NULL`).Scan(&a)
		if a.Valid {
			v := float64(int(a.Float64*10+0.5)) / 10
			e.AgeMoyen = &v
		}
		return x
	})
	step(func() (x error) {
		e.Statuts, x = h.counts(`SELECT COALESCE(NULLIF(statut, ''), ?) AS l, COUNT(*) FROM members GROUP BY l ORDER BY COUNT(*) DESC, l`, nonRenseigne)
		return x
	})
	step(func() (x error) {
		e.Groupes, x = h.counts(`SELECT COALESCE(NULLIF(groupe, ''), ?) AS l, COUNT(*) FROM members GROUP BY l ORDER BY COUNT(*) DESC, l`, nonRenseigne)
		return x
	})
	step(func() (x error) {
		e.Sexes, x = h.counts(`
			SELECT CASE sexe WHEN 'F' THEN 'Femmes' WHEN 'H' THEN 'Hommes' ELSE ? END AS l, COUNT(*)
			FROM members GROUP BY l ORDER BY l`, nonRenseigne)
		return x
	})
	step(func() (x error) {
		e.Ages, x = h.counts(`
			SELECT t.l, COUNT(*) FROM (
				SELECT CASE
					WHEN date_naissance IS NULL THEN ?
					WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 18 THEN 'Moins de 18 ans'
					WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 30 THEN '18-29 ans'
					WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 40 THEN '30-39 ans'
					WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 50 THEN '40-49 ans'
					WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 60 THEN '50-59 ans'
					WHEN TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) < 70 THEN '60-69 ans'
					ELSE '70 ans et plus' END AS l
				FROM members) t
			GROUP BY t.l ORDER BY t.l`, nonRenseigne)
		return x
	})
	step(func() (x error) {
		e.PremiereAdhesion, x = h.counts(`SELECT CAST(annee_premiere_adhesion AS CHAR), COUNT(*) FROM members WHERE annee_premiere_adhesion IS NOT NULL GROUP BY annee_premiere_adhesion ORDER BY annee_premiere_adhesion`)
		return x
	})
	step(func() (x error) {
		e.DerniereAdhesion, x = h.counts(`SELECT CAST(annee_derniere_adhesion AS CHAR), COUNT(*) FROM members WHERE annee_derniere_adhesion IS NOT NULL GROUP BY annee_derniere_adhesion ORDER BY annee_derniere_adhesion`)
		return x
	})
	if err != nil {
		fail(w, err)
		return
	}
	e.Ages = ordonner(e.Ages, []string{"Moins de 18 ans", "18-29 ans", "30-39 ans", "40-49 ans", "50-59 ans", "60-69 ans", "70 ans et plus", nonRenseigne})
	httpx.JSON(w, http.StatusOK, e)
}

// ordonner : les valeurs dans l'ordre donné (les libellés absents des données sont omis).
func ordonner(in []Count, ordre []string) []Count {
	par := map[string]int{}
	for _, c := range in {
		par[c.Label] = c.N
	}
	out := []Count{}
	for _, l := range ordre {
		if n, ok := par[l]; ok {
			out = append(out, Count{l, n})
		}
	}
	return out
}

// ---------------------------------------------------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------------------------------------------------

type CourseLigne struct {
	ID                 int64   `json:"id"`
	Titre              string  `json:"titre"`
	Date               string  `json:"date"`
	Lieu               string  `json:"lieu"`
	Type               string  `json:"type"`
	DistanceKm         float64 `json:"distanceKm"`
	Inscrits           int     `json:"inscrits"`
	Classes            int     `json:"classes"`
	MeilleurClassement *int    `json:"meilleurClassement"`
	MeilleurTemps      *int    `json:"meilleurTemps"` // secondes
}

type Assidu struct {
	Nom      string  `json:"nom"`
	Groupe   string  `json:"groupe"`
	Courses  int     `json:"courses"`
	Km       float64 `json:"km"`
	Podiums  int     `json:"podiums"`
	Derniere string  `json:"derniere"`
}

// Mesure : une valeur décimale d'un graphique (libellé + mesure, ex. une allure en km/h).
type Mesure struct {
	Label string  `json:"label"`
	N     float64 `json:"n"`
}

type PlusLongue struct {
	Titre string  `json:"titre"`
	Km    float64 `json:"km"`
}

// Tranches de distance (km) : libellé, borne haute incluse (0 : au-delà de la dernière borne).
var tranchesDistance = []string{"Jusqu'à 5 km", "6 à 10 km", "11 à 21 km", "22 à 42 km", "Plus de 42 km"}

const sqlTrancheDistance = `CASE WHEN ra.distance_km <= 0 THEN 'Distance inconnue'
	WHEN ra.distance_km <= 5.5 THEN 'Jusqu''à 5 km' WHEN ra.distance_km <= 10.5 THEN '6 à 10 km'
	WHEN ra.distance_km <= 21.5 THEN '11 à 21 km' WHEN ra.distance_km <= 42.5 THEN '22 à 42 km' ELSE 'Plus de 42 km' END`

type Courses struct {
	Saison             int           `json:"saison"` // année de départ (septembre) ; 0 : toutes
	Saisons            []int         `json:"saisons"`
	Courses            int           `json:"courses"`
	AvecResultats      int           `json:"avecResultats"`
	Resultats          int           `json:"resultats"`
	Classes            int           `json:"classes"` // adhérents distincts ayant un résultat
	Km                 float64       `json:"km"`
	PodiumsCategorie   int           `json:"podiumsCategorie"`
	PodiumsGeneral     int           `json:"podiumsGeneral"`
	InscriptionsAVenir int           `json:"inscriptionsAVenir"`
	Adherents          int           `json:"adherents"`     // adhérents en base (pour le taux de participation)
	AllureMoyenne      float64       `json:"allureMoyenne"` // km/h, sur les résultats dont la distance est connue
	PlusLongue         *PlusLongue   `json:"plusLongue"`
	ParType            []Count       `json:"parType"`
	ParDistance        []Count       `json:"parDistance"`
	ParSexe            []Count       `json:"parSexe"`
	ParGroupe          []Count       `json:"parGroupe"`
	Regularite         []Count       `json:"regularite"` // adhérents selon leur nombre de courses
	TopCourses         []Count       `json:"topCourses"`
	ParSaison          []Count       `json:"parSaison"` // résultats par saison (toutes saisons)
	AllureParDistance  []Mesure      `json:"allureParDistance"`
	ParMois            []Count       `json:"parMois"`
	Lignes             []CourseLigne `json:"lignes"`
	Assidus            []Assidu      `json:"assidus"`
}

// bornesSaison : une saison sportive va du 1er septembre au 31 août (la saison « 2025 » est 2025-2026).
func bornesSaison(saison int) (string, string) {
	if saison <= 0 {
		return "1900-01-01", "2999-01-01"
	}
	return fmt.Sprintf("%d-09-01", saison), fmt.Sprintf("%d-09-01", saison+1)
}

func saisonParam(r *http.Request) int {
	n, _ := strconv.Atoi(r.URL.Query().Get("saison"))
	if n < 1990 || n > 2999 {
		return 0
	}
	return n
}

// Courses : participation du club aux courses, résultats, kilomètres, podiums, assiduité nominative.
func (h *Handler) Courses(w http.ResponseWriter, r *http.Request) {
	saison := saisonParam(r)
	du, au := bornesSaison(saison)
	c := Courses{Saison: saison}
	var err error
	step := func(f func() error) {
		if err == nil {
			err = f()
		}
	}
	step(func() (x error) {
		rows, x := h.db.Query(`SELECT DISTINCT YEAR(race_date) - (MONTH(race_date) < 9) FROM races ORDER BY 1 DESC`)
		if x != nil {
			return x
		}
		defer rows.Close()
		c.Saisons = []int{}
		for rows.Next() {
			var s int
			if x = rows.Scan(&s); x != nil {
				return x
			}
			c.Saisons = append(c.Saisons, s)
		}
		return rows.Err()
	})
	step(func() (x error) {
		c.Courses, x = h.one(`SELECT COUNT(*) FROM races WHERE race_date >= ? AND race_date < ?`, du, au)
		return x
	})
	step(func() (x error) {
		var avec, res, cl, pc, pg sql.NullInt64
		var km sql.NullFloat64
		x = h.db.QueryRow(`
			SELECT COUNT(DISTINCT rr.race_id), COUNT(*), COUNT(DISTINCT rr.member_id), SUM(ra.distance_km),
			       SUM(rr.classement_categorie BETWEEN 1 AND 3), SUM(rr.classement_general BETWEEN 1 AND 3)
			FROM race_results rr JOIN races ra ON ra.id = rr.race_id
			WHERE ra.race_date >= ? AND ra.race_date < ?`, du, au).Scan(&avec, &res, &cl, &km, &pc, &pg)
		c.AvecResultats, c.Resultats, c.Classes = int(avec.Int64), int(res.Int64), int(cl.Int64)
		c.Km, c.PodiumsCategorie, c.PodiumsGeneral = km.Float64, int(pc.Int64), int(pg.Int64)
		return x
	})
	step(func() (x error) {
		c.InscriptionsAVenir, x = h.one(`
			SELECT COUNT(*) FROM race_registrations rg JOIN races ra ON ra.id = rg.race_id WHERE ra.race_date >= CURDATE()`)
		return x
	})
	step(func() (x error) {
		c.ParType, x = h.counts(`
			SELECT COALESCE(NULLIF(ra.type, ''), 'Non précisé') AS l, COUNT(*)
			FROM race_results rr JOIN races ra ON ra.id = rr.race_id
			WHERE ra.race_date >= ? AND ra.race_date < ? GROUP BY l ORDER BY COUNT(*) DESC, l`, du, au)
		return x
	})
	step(func() (x error) {
		// Les 24 derniers mois comportant des résultats, du plus ancien au plus récent.
		c.ParMois, x = h.counts(`
			SELECT t.m, t.n FROM (
				SELECT DATE_FORMAT(ra.race_date, '%Y-%m') AS m, COUNT(*) AS n
				FROM race_results rr JOIN races ra ON ra.id = rr.race_id
				WHERE ra.race_date >= ? AND ra.race_date < ? GROUP BY m ORDER BY m DESC LIMIT 24) t
			ORDER BY t.m`, du, au)
		return x
	})
	step(func() (x error) {
		rows, x := h.db.Query(`
			SELECT ra.id, ra.titre, DATE_FORMAT(ra.race_date, '%Y-%m-%d'), ra.lieu, ra.type, ra.distance_km,
			       (SELECT COUNT(*) FROM race_registrations rg WHERE rg.race_id = ra.id),
			       (SELECT COUNT(*) FROM race_results rr WHERE rr.race_id = ra.id),
			       (SELECT MIN(rr.classement_general) FROM race_results rr WHERE rr.race_id = ra.id),
			       (SELECT MIN(rr.temps_secondes) FROM race_results rr WHERE rr.race_id = ra.id)
			FROM races ra
			WHERE ra.race_date >= ? AND ra.race_date < ?
			  AND (EXISTS (SELECT 1 FROM race_registrations rg WHERE rg.race_id = ra.id) OR EXISTS (SELECT 1 FROM race_results rr WHERE rr.race_id = ra.id))
			ORDER BY ra.race_date DESC, ra.id DESC LIMIT 200`, du, au)
		if x != nil {
			return x
		}
		defer rows.Close()
		c.Lignes = []CourseLigne{}
		for rows.Next() {
			var l CourseLigne
			var best, bestT sql.NullInt64
			if x = rows.Scan(&l.ID, &l.Titre, &l.Date, &l.Lieu, &l.Type, &l.DistanceKm, &l.Inscrits, &l.Classes, &best, &bestT); x != nil {
				return x
			}
			if best.Valid {
				v := int(best.Int64)
				l.MeilleurClassement = &v
			}
			if bestT.Valid {
				v := int(bestT.Int64)
				l.MeilleurTemps = &v
			}
			c.Lignes = append(c.Lignes, l)
		}
		return rows.Err()
	})
	step(func() (x error) {
		c.Assidus, x = h.assidus(du, au, 20)
		return x
	})
	h.courseDetails(&c, du, au, step)
	if err != nil {
		fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, c)
}

// assidus : adhérents classés par nombre de courses terminées (liste nominative). limit <= 0 : tous.
func (h *Handler) assidus(du, au string, limit int) ([]Assidu, error) {
	q := `
		SELECT CONCAT(m.nom, ' ', m.prenom), m.groupe, COUNT(*), COALESCE(SUM(ra.distance_km), 0),
		       COALESCE(SUM(rr.classement_categorie BETWEEN 1 AND 3), 0), DATE_FORMAT(MAX(ra.race_date), '%Y-%m-%d')
		FROM race_results rr
		JOIN races ra ON ra.id = rr.race_id
		JOIN members m ON m.id = rr.member_id
		WHERE ra.race_date >= ? AND ra.race_date < ?
		GROUP BY m.id, m.nom, m.prenom, m.groupe
		ORDER BY COUNT(*) DESC, SUM(ra.distance_km) DESC, m.nom, m.prenom`
	args := []any{du, au}
	if limit > 0 {
		q += ` LIMIT ?`
		args = append(args, limit)
	}
	rows, err := h.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Assidu{}
	for rows.Next() {
		var a Assidu
		if err := rows.Scan(&a.Nom, &a.Groupe, &a.Courses, &a.Km, &a.Podiums, &a.Derniere); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// AssiduiteCSV : liste complète des adhérents classés par assiduité (export Excel : séparateur « ; », UTF-8 avec BOM).
func (h *Handler) AssiduiteCSV(w http.ResponseWriter, r *http.Request) {
	saison := saisonParam(r)
	du, au := bornesSaison(saison)
	list, err := h.assidus(du, au, 0)
	if err != nil {
		fail(w, err)
		return
	}
	nom := "assiduite-courses"
	if saison > 0 {
		nom += fmt.Sprintf("-%d-%d", saison, saison+1)
	}
	lignes := [][]string{{"Rang", "Nom Prénom", "Groupe", "Courses", "Kilomètres", "Podiums de catégorie", "Derniere course"}}
	for i, a := range list {
		lignes = append(lignes, []string{strconv.Itoa(i + 1), a.Nom, a.Groupe, strconv.Itoa(a.Courses), strings.Replace(strconv.FormatFloat(a.Km, 'f', 1, 64), ".", ",", 1), strconv.Itoa(a.Podiums), a.Derniere})
	}
	writeCSV(w, nom, lignes)
}

func writeCSV(w http.ResponseWriter, nom string, lignes [][]string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+nom+"-"+time.Now().Format("2006-01-02")+`.csv"`)
	_, _ = w.Write([]byte("\ufeff"))
	// Une cellule qui commence par = + - @ serait interprétée comme une formule par Excel : on la neutralise.
	for _, l := range lignes {
		for i, c := range l {
			if c != "" && strings.ContainsRune("=+-@", rune(c[0])) {
				l[i] = "'" + c
			}
		}
	}
	cw := csv.NewWriter(w)
	cw.Comma = ';'
	_ = cw.WriteAll(lignes)
}

// ---------------------------------------------------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------------------------------------------------

type FicheIncomplete struct {
	ID      int64    `json:"id"`
	Nom     string   `json:"nom"`
	Groupe  string   `json:"groupe"`
	Statut  string   `json:"statut"`
	Manques []string `json:"manques"`
}

type Engagement struct {
	Comptes struct {
		Total      int `json:"total"`
		Actives    int `json:"actives"`    // ont défini leur mot de passe (compte activé)
		Invites    int `json:"invites"`    // email de bienvenue envoyé mais compte non activé
		NonInvites int `json:"nonInvites"` // aucun email de bienvenue envoyé
	} `json:"comptes"`
	Connexions struct {
		Actifs7j  int     `json:"actifs7j"`
		Actifs30j int     `json:"actifs30j"`
		Total30j  int     `json:"total30j"`
		ParJour   []Count `json:"parJour"` // 30 derniers jours : adhérents distincts connectés ce jour-là
		DepuisLe  string  `json:"depuisLe"`
	} `json:"connexions"`
	Messagerie struct {
		Messages30j   int     `json:"messages30j"`
		Expediteurs30 int     `json:"expediteurs30j"`
		Salons30j     int     `json:"salons30j"`
		TopSalons     []Count `json:"topSalons"`
	} `json:"messagerie"`
	Jeu struct {
		Joueurs int `json:"joueurs"`
		Record  int `json:"record"`
	} `json:"jeu"`
	Fiches struct {
		Evaluees    int               `json:"evaluees"` // adhérents contrôlés (hors « Anciens adhérents »)
		Completes   int               `json:"completes"`
		ParManque   []Count           `json:"parManque"`
		Incompletes []FicheIncomplete `json:"incompletes"`
	} `json:"fiches"`
}

// Contrôles de complétude d'une fiche : libellé et condition SQL vraie quand l'information manque.
var manques = []struct{ label, cond string }{
	{"Photo", `photo_path = ''`},
	{"Date de naissance", `date_naissance IS NULL`},
	{"N° de licence", `numero_licence = ''`},
	{"Téléphone portable", `telephone_portable = ''`},
	{"Contact d'urgence", `(urgence_nom = '' OR urgence_telephone = '')`},
	{"Certificat médical", `date_dernier_certificat IS NULL`},
}

// fichesIncompletes : adhérents dont des informations manquent (hors « Anciens adhérents »), avec la liste des manques.
func (h *Handler) fichesIncompletes() (evaluees int, liste []FicheIncomplete, parManque []Count, err error) {
	cols := make([]string, len(manques))
	for i, m := range manques {
		cols[i] = "(" + m.cond + ")"
	}
	rows, err := h.db.Query(`SELECT id, CONCAT(nom, ' ', prenom), groupe, statut, ` + strings.Join(cols, ", ") +
		` FROM members WHERE statut <> 'Anciens adhérents' ORDER BY nom, prenom`)
	if err != nil {
		return 0, nil, nil, err
	}
	defer rows.Close()
	total := make([]int, len(manques))
	liste = []FicheIncomplete{}
	for rows.Next() {
		evaluees++
		f := FicheIncomplete{Manques: []string{}}
		flags := make([]bool, len(manques))
		dest := []any{&f.ID, &f.Nom, &f.Groupe, &f.Statut}
		for i := range flags {
			dest = append(dest, &flags[i])
		}
		if err = rows.Scan(dest...); err != nil {
			return 0, nil, nil, err
		}
		for i, manque := range flags {
			if manque {
				f.Manques = append(f.Manques, manques[i].label)
				total[i]++
			}
		}
		if len(f.Manques) > 0 {
			liste = append(liste, f)
		}
	}
	for i, m := range manques {
		parManque = append(parManque, Count{m.label, total[i]})
	}
	return evaluees, liste, parManque, rows.Err()
}

// Engagement : usage de l'espace adhérent (comptes, connexions, messagerie, jeu) et qualité des fiches.
func (h *Handler) Engagement(w http.ResponseWriter, r *http.Request) {
	var g Engagement
	var err error
	step := func(f func() error) {
		if err == nil {
			err = f()
		}
	}
	step(func() error {
		var tot, act, inv sql.NullInt64
		x := h.db.QueryRow(`
			SELECT COUNT(*), SUM(activated_at IS NOT NULL), SUM(activated_at IS NULL AND welcome_email_sent_at IS NOT NULL) FROM members`).Scan(&tot, &act, &inv)
		g.Comptes.Total, g.Comptes.Actives, g.Comptes.Invites = int(tot.Int64), int(act.Int64), int(inv.Int64)
		g.Comptes.NonInvites = g.Comptes.Total - g.Comptes.Actives - g.Comptes.Invites
		return x
	})
	step(func() (x error) {
		g.Connexions.Actifs7j, x = h.one(`SELECT COUNT(DISTINCT member_id) FROM audit_log WHERE action = 'Connexion' AND success = TRUE AND created_at >= ?`, time.Now().AddDate(0, 0, -7))
		return x
	})
	step(func() (x error) {
		g.Connexions.Actifs30j, x = h.one(`SELECT COUNT(DISTINCT member_id) FROM audit_log WHERE action = 'Connexion' AND success = TRUE AND created_at >= ?`, time.Now().AddDate(0, 0, -30))
		return x
	})
	step(func() (x error) {
		g.Connexions.Total30j, x = h.one(`SELECT COUNT(*) FROM audit_log WHERE action = 'Connexion' AND success = TRUE AND created_at >= ?`, time.Now().AddDate(0, 0, -30))
		return x
	})
	step(func() error {
		debut := time.Now().AddDate(0, 0, -29)
		debut = time.Date(debut.Year(), debut.Month(), debut.Day(), 0, 0, 0, 0, debut.Location())
		jours, x := h.counts(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d'), COUNT(DISTINCT member_id) FROM audit_log
			WHERE action = 'Connexion' AND success = TRUE AND created_at >= ? GROUP BY 1`, debut)
		if x != nil {
			return x
		}
		par := map[string]int{}
		for _, j := range jours {
			par[j.Label] = j.N
		}
		g.Connexions.ParJour = make([]Count, 0, 30)
		for i := 0; i < 30; i++ {
			d := debut.AddDate(0, 0, i).Format("2006-01-02")
			g.Connexions.ParJour = append(g.Connexions.ParJour, Count{d, par[d]})
		}
		var premier sql.NullString
		_ = h.db.QueryRow(`SELECT DATE_FORMAT(MIN(created_at), '%Y-%m-%d') FROM audit_log WHERE action = 'Connexion'`).Scan(&premier)
		g.Connexions.DepuisLe = premier.String
		return nil
	})
	depuis := time.Now().AddDate(0, 0, -30)
	step(func() error {
		var n, exp, salons sql.NullInt64
		x := h.db.QueryRow(`SELECT COUNT(*), COUNT(DISTINCT sender_id), COUNT(DISTINCT room_id) FROM chat_messages WHERE deleted_at IS NULL AND created_at >= ?`, depuis).Scan(&n, &exp, &salons)
		g.Messagerie.Messages30j, g.Messagerie.Expediteurs30, g.Messagerie.Salons30j = int(n.Int64), int(exp.Int64), int(salons.Int64)
		return x
	})
	step(func() (x error) {
		// Seuls les salons de groupe sont nommés : les messages privés restent comptés dans le total, jamais détaillés.
		g.Messagerie.TopSalons, x = h.counts(`
			SELECT cr.nom, COUNT(*) FROM chat_messages cm JOIN chat_rooms cr ON cr.id = cm.room_id
			WHERE cr.kind <> 'dm' AND cm.deleted_at IS NULL AND cm.created_at >= ?
			GROUP BY cr.id, cr.nom ORDER BY COUNT(*) DESC, cr.nom LIMIT 5`, depuis)
		return x
	})
	step(func() error {
		var rec sql.NullInt64
		x := h.db.QueryRow(`SELECT COUNT(*), MAX(best_meters) FROM game_scores WHERE best_meters > 0`).Scan(&g.Jeu.Joueurs, &rec)
		g.Jeu.Record = int(rec.Int64)
		return x
	})
	step(func() (x error) {
		g.Fiches.Evaluees, g.Fiches.Incompletes, g.Fiches.ParManque, x = h.fichesIncompletes()
		g.Fiches.Completes = g.Fiches.Evaluees - len(g.Fiches.Incompletes)
		return x
	})
	if err != nil {
		fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, g)
}

// FichesCSV : liste des fiches incomplètes, pour relancer les adhérents concernés.
func (h *Handler) FichesCSV(w http.ResponseWriter, r *http.Request) {
	_, liste, _, err := h.fichesIncompletes()
	if err != nil {
		fail(w, err)
		return
	}
	lignes := [][]string{{"Nom Prénom", "Groupe", "Statut", "Informations manquantes"}}
	for _, f := range liste {
		lignes = append(lignes, []string{f.Nom, f.Groupe, f.Statut, strings.Join(f.Manques, ", ")})
	}
	writeCSV(w, "fiches-incompletes", lignes)
}

// courseDetails : répartitions et indicateurs complémentaires de la section Courses.
func (h *Handler) courseDetails(c *Courses, du, au string, step func(func() error)) {
	const from = ` FROM race_results rr JOIN races ra ON ra.id = rr.race_id JOIN members m ON m.id = rr.member_id WHERE ra.race_date >= ? AND ra.race_date < ?`
	step(func() (x error) {
		c.Adherents, x = h.one(`SELECT COUNT(*) FROM members`)
		return x
	})
	step(func() (x error) {
		var a sql.NullFloat64
		x = h.db.QueryRow(`SELECT AVG(ra.distance_km / (rr.temps_secondes / 3600))`+from+` AND ra.distance_km > 0 AND rr.temps_secondes > 0`, du, au).Scan(&a)
		c.AllureMoyenne = float64(int(a.Float64*10+0.5)) / 10
		return x
	})
	step(func() error {
		var pl PlusLongue
		x := h.db.QueryRow(`SELECT ra.titre, ra.distance_km`+from+` ORDER BY ra.distance_km DESC, ra.race_date DESC LIMIT 1`, du, au).Scan(&pl.Titre, &pl.Km)
		if x == sql.ErrNoRows {
			return nil
		}
		if pl.Km > 0 {
			c.PlusLongue = &pl
		}
		return x
	})
	step(func() error {
		l, x := h.counts(`SELECT `+sqlTrancheDistance+` AS l, COUNT(*)`+from+` GROUP BY l`, du, au)
		c.ParDistance = ordonner(l, append(append([]string{}, tranchesDistance...), "Distance inconnue"))
		return x
	})
	step(func() (x error) {
		c.ParSexe, x = h.counts(`SELECT CASE m.sexe WHEN 'F' THEN 'Femmes' WHEN 'H' THEN 'Hommes' ELSE ? END AS l, COUNT(*)`+from+` GROUP BY l ORDER BY COUNT(*) DESC`, append([]any{nonRenseigne}, du, au)...)
		return x
	})
	step(func() (x error) {
		c.ParGroupe, x = h.counts(`SELECT COALESCE(NULLIF(m.groupe, ''), ?) AS l, COUNT(*)`+from+` GROUP BY l ORDER BY COUNT(*) DESC, l`, append([]any{nonRenseigne}, du, au)...)
		return x
	})
	step(func() error {
		l, x := h.counts(`
			SELECT CASE WHEN t.c = 1 THEN '1 course' WHEN t.c <= 3 THEN '2 à 3 courses' WHEN t.c <= 6 THEN '4 à 6 courses' ELSE '7 courses et plus' END AS l, COUNT(*)
			FROM (SELECT rr.member_id, COUNT(*) AS c FROM race_results rr JOIN races ra ON ra.id = rr.race_id
			      WHERE ra.race_date >= ? AND ra.race_date < ? GROUP BY rr.member_id) t GROUP BY l`, du, au)
		c.Regularite = ordonner(l, []string{"1 course", "2 à 3 courses", "4 à 6 courses", "7 courses et plus"})
		return x
	})
	step(func() (x error) {
		c.TopCourses, x = h.counts(`
			SELECT CONCAT(ra.titre, ' (', DATE_FORMAT(ra.race_date, '%m/%Y'), ')'), COUNT(*)`+from+`
			GROUP BY ra.id, ra.titre, ra.race_date ORDER BY COUNT(*) DESC, ra.race_date DESC LIMIT 8`, du, au)
		return x
	})
	step(func() (x error) {
		c.ParSaison, x = h.counts(`
			SELECT CONCAT(t.s, '-', t.s + 1), t.n FROM (
				SELECT YEAR(ra.race_date) - (MONTH(ra.race_date) < 9) AS s, COUNT(*) AS n
				FROM race_results rr JOIN races ra ON ra.id = rr.race_id GROUP BY s) t ORDER BY t.s`)
		return x
	})
	step(func() error {
		rows, x := h.db.Query(`SELECT `+sqlTrancheDistance+` AS l, AVG(ra.distance_km / (rr.temps_secondes / 3600))`+from+`
			AND ra.distance_km > 0 AND rr.temps_secondes > 0 GROUP BY l`, du, au)
		if x != nil {
			return x
		}
		defer rows.Close()
		par := map[string]float64{}
		for rows.Next() {
			var l string
			var v float64
			if x = rows.Scan(&l, &v); x != nil {
				return x
			}
			par[l] = float64(int(v*10+0.5)) / 10
		}
		c.AllureParDistance = []Mesure{}
		for _, l := range tranchesDistance {
			if v, ok := par[l]; ok {
				c.AllureParDistance = append(c.AllureParDistance, Mesure{l, v})
			}
		}
		return rows.Err()
	})
}
