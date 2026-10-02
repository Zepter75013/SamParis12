package race

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/member"
)

// Race est une course proposée par un adhérent : n'importe quel adhérent
// peut en créer une, et n'importe quel adhérent peut s'y inscrire pour
// indiquer qu'il y participe.
type Race struct {
	ID               int64     `json:"id"`
	Titre            string    `json:"titre"`
	Date             time.Time `json:"date"`
	Lieu             string    `json:"lieu"`
	Type             string    `json:"type"`
	DistanceKm       float64   `json:"distanceKm"`
	Description      string    `json:"description"`
	SiteInternet     string    `json:"siteInternet"`
	CreatedBy        int64     `json:"createdBy"`
	CreatedByPrenom  string    `json:"createdByPrenom"`
	CreatedByNom     string    `json:"createdByNom"`
	InscritsCount    int       `json:"inscritsCount"`
	ResultsCount     int       `json:"resultsCount"`
	IsRegisteredByMe bool      `json:"isRegisteredByMe"`
}

// RaceCreate est le sous-ensemble de champs fourni par l'adhérent qui crée une course.
type RaceCreate struct {
	Titre        string  `json:"titre"`
	Date         string  `json:"date"`
	Lieu         string  `json:"lieu"`
	Type         string  `json:"type"`
	DistanceKm   float64 `json:"distanceKm"`
	Description  string  `json:"description"`
	SiteInternet string  `json:"siteInternet"`
}

// Participant est un adhérent inscrit à une course (ou recherchant/cédant un dossard).
type Participant struct {
	MemberID int64  `json:"memberId"`
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"`
	PhotoURL string `json:"photoUrl"`
	Email    string `json:"email"`
}

// RaceResult est le résultat officiel d'un adhérent sur une course, saisi
// manuellement par un membre ayant le droit de saisie des résultats.
// L'allure (km/h) n'est jamais stockée : elle est recalculée à chaque lecture
// à partir de la distance de la course et du temps, pour rester toujours
// cohérente si l'un des deux est corrigé après coup.
type RaceResult struct {
	ID                       int64   `json:"id"`
	RaceID                   int64   `json:"raceId"`
	MemberID                 int64   `json:"memberId"`
	Prenom                   string  `json:"prenom"`
	Nom                      string  `json:"nom"`
	PhotoURL                 string  `json:"photoUrl"`
	TempsSecondes            int     `json:"tempsSecondes"`
	AllureKmh                float64 `json:"allureKmh"`
	ClassementGeneral        *int    `json:"classementGeneral"`
	ClassementGeneralTotal   *int    `json:"classementGeneralTotal"`
	Categorie                string  `json:"categorie"`
	ClassementCategorie      *int    `json:"classementCategorie"`
	ClassementCategorieTotal *int    `json:"classementCategorieTotal"`
}

// RaceResultInput est le sous-ensemble de champs fourni par la personne qui
// saisit un résultat pour un adhérent donné.
type RaceResultInput struct {
	TempsSecondes            int    `json:"tempsSecondes"`
	ClassementGeneral        *int   `json:"classementGeneral"`
	ClassementGeneralTotal   *int   `json:"classementGeneralTotal"`
	Categorie                string `json:"categorie"`
	ClassementCategorie      *int   `json:"classementCategorie"`
	ClassementCategorieTotal *int   `json:"classementCategorieTotal"`
}

// dossardKindRecherche et dossardKindCession sont les deux valeurs possibles
// de la colonne `kind` de race_dossard_signals.
const (
	dossardKindRecherche = "recherche"
	dossardKindCession   = "cession"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

const raceColumns = `
	r.id, r.titre, r.race_date, r.lieu, r.type, r.distance_km, r.description, r.site_internet,
	r.created_by, m.prenom, m.nom,
	(SELECT COUNT(*) FROM race_registrations rr WHERE rr.race_id = r.id),
	(SELECT COUNT(*) FROM race_results rz WHERE rz.race_id = r.id)
`

func scanRace(scan func(...any) error) (*Race, error) {
	var race Race
	if err := scan(
		&race.ID, &race.Titre, &race.Date, &race.Lieu, &race.Type, &race.DistanceKm, &race.Description, &race.SiteInternet,
		&race.CreatedBy, &race.CreatedByPrenom, &race.CreatedByNom, &race.InscritsCount, &race.ResultsCount,
	); err != nil {
		return nil, err
	}
	return &race, nil
}

func (r *Repository) List(viewerID int64) ([]Race, error) {
	rows, err := r.db.Query(`
		SELECT ` + raceColumns + `
		FROM races r
		JOIN members m ON m.id = r.created_by
		ORDER BY r.race_date ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	races := []Race{}
	for rows.Next() {
		race, err := scanRace(rows.Scan)
		if err != nil {
			return nil, err
		}
		races = append(races, *race)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := r.fillIsRegistered(races, viewerID); err != nil {
		return nil, err
	}
	return races, nil
}

func (r *Repository) GetByID(id int64, viewerID int64) (*Race, error) {
	row := r.db.QueryRow(`
		SELECT `+raceColumns+`
		FROM races r
		JOIN members m ON m.id = r.created_by
		WHERE r.id = ?`, id)
	race, err := scanRace(row.Scan)
	if err != nil {
		return nil, err
	}
	races := []Race{*race}
	if err := r.fillIsRegistered(races, viewerID); err != nil {
		return nil, err
	}
	return &races[0], nil
}

func (r *Repository) fillIsRegistered(races []Race, viewerID int64) error {
	if len(races) == 0 {
		return nil
	}
	rows, err := r.db.Query(`SELECT race_id FROM race_registrations WHERE member_id = ?`, viewerID)
	if err != nil {
		return err
	}
	defer rows.Close()

	registered := map[int64]bool{}
	for rows.Next() {
		var raceID int64
		if err := rows.Scan(&raceID); err != nil {
			return err
		}
		registered[raceID] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for i := range races {
		races[i].IsRegisteredByMe = registered[races[i].ID]
	}
	return nil
}

func (r *Repository) Create(memberID int64, rc RaceCreate) (int64, error) {
	res, err := r.db.Exec(`
		INSERT INTO races (titre, race_date, lieu, type, distance_km, description, site_internet, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		rc.Titre, rc.Date, rc.Lieu, rc.Type, rc.DistanceKm, rc.Description, rc.SiteInternet, memberID,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) Participants(raceID int64) ([]Participant, error) {
	rows, err := r.db.Query(`
		SELECT m.id, m.prenom, m.nom, m.photo_path, m.email
		FROM race_registrations rr
		JOIN members m ON m.id = rr.member_id
		WHERE rr.race_id = ?
		ORDER BY m.nom, m.prenom`, raceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	participants := []Participant{}
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.MemberID, &p.Prenom, &p.Nom, &p.PhotoURL, &p.Email); err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}
	return participants, rows.Err()
}

func (r *Repository) IsRegistered(raceID, memberID int64) (bool, error) {
	var exists int
	err := r.db.QueryRow(`SELECT 1 FROM race_registrations WHERE race_id = ? AND member_id = ?`, raceID, memberID).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *Repository) Register(raceID, memberID int64) error {
	_, err := r.db.Exec(`
		INSERT INTO race_registrations (race_id, member_id) VALUES (?, ?)
		ON DUPLICATE KEY UPDATE id = id`, raceID, memberID)
	return err
}

func (r *Repository) Unregister(raceID, memberID int64) error {
	_, err := r.db.Exec(`DELETE FROM race_registrations WHERE race_id = ? AND member_id = ?`, raceID, memberID)
	return err
}

// DossardSignal (kind = "recherche" ou "cession") indique qu'un adhérent
// recherche un dossard pour une course, ou au contraire cherche à céder le sien.
func (r *Repository) DossardSignal(raceID, memberID int64, kind string) error {
	_, err := r.db.Exec(`
		INSERT INTO race_dossard_signals (race_id, member_id, kind) VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE id = id`, raceID, memberID, kind)
	return err
}

func (r *Repository) DossardUnsignal(raceID, memberID int64, kind string) error {
	_, err := r.db.Exec(`DELETE FROM race_dossard_signals WHERE race_id = ? AND member_id = ? AND kind = ?`, raceID, memberID, kind)
	return err
}

func (r *Repository) DossardSignals(raceID int64, kind string) ([]Participant, error) {
	rows, err := r.db.Query(`
		SELECT m.id, m.prenom, m.nom, m.photo_path, m.email
		FROM race_dossard_signals s
		JOIN members m ON m.id = s.member_id
		WHERE s.race_id = ? AND s.kind = ?
		ORDER BY m.nom, m.prenom`, raceID, kind)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	signals := []Participant{}
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.MemberID, &p.Prenom, &p.Nom, &p.PhotoURL, &p.Email); err != nil {
			return nil, err
		}
		signals = append(signals, p)
	}
	return signals, rows.Err()
}

func (r *Repository) DossardIsSignaled(raceID, memberID int64, kind string) (bool, error) {
	var exists int
	err := r.db.QueryRow(`SELECT 1 FROM race_dossard_signals WHERE race_id = ? AND member_id = ? AND kind = ?`, raceID, memberID, kind).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// Results retourne les résultats enregistrés pour une course, triés par
// classement général (les résultats sans classement renseigné arrivent en
// dernier). L'allure (km/h) est calculée à la volée à partir de la distance
// de la course.
func (r *Repository) Results(raceID int64, distanceKm float64) ([]RaceResult, error) {
	rows, err := r.db.Query(`
		SELECT rz.id, rz.race_id, rz.member_id, m.prenom, m.nom, m.photo_path,
			rz.temps_secondes, rz.classement_general, rz.classement_general_total,
			rz.categorie, rz.classement_categorie, rz.classement_categorie_total
		FROM race_results rz
		JOIN members m ON m.id = rz.member_id
		WHERE rz.race_id = ?
		ORDER BY (rz.classement_general IS NULL), rz.classement_general ASC, rz.temps_secondes ASC`, raceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := []RaceResult{}
	for rows.Next() {
		var res RaceResult
		if err := rows.Scan(
			&res.ID, &res.RaceID, &res.MemberID, &res.Prenom, &res.Nom, &res.PhotoURL,
			&res.TempsSecondes, &res.ClassementGeneral, &res.ClassementGeneralTotal,
			&res.Categorie, &res.ClassementCategorie, &res.ClassementCategorieTotal,
		); err != nil {
			return nil, err
		}
		if distanceKm > 0 && res.TempsSecondes > 0 {
			res.AllureKmh = distanceKm / (float64(res.TempsSecondes) / 3600.0)
		}
		results = append(results, res)
	}
	return results, rows.Err()
}

func (r *Repository) UpsertResult(raceID, memberID, enteredBy int64, in RaceResultInput) error {
	_, err := r.db.Exec(`
		INSERT INTO race_results (
			race_id, member_id, temps_secondes, classement_general, classement_general_total,
			categorie, classement_categorie, classement_categorie_total, created_by
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			temps_secondes = VALUES(temps_secondes),
			classement_general = VALUES(classement_general),
			classement_general_total = VALUES(classement_general_total),
			categorie = VALUES(categorie),
			classement_categorie = VALUES(classement_categorie),
			classement_categorie_total = VALUES(classement_categorie_total),
			created_by = VALUES(created_by)`,
		raceID, memberID, in.TempsSecondes, in.ClassementGeneral, in.ClassementGeneralTotal,
		in.Categorie, in.ClassementCategorie, in.ClassementCategorieTotal, enteredBy,
	)
	return err
}

func (r *Repository) DeleteResult(raceID, memberID int64) error {
	_, err := r.db.Exec(`DELETE FROM race_results WHERE race_id = ? AND member_id = ?`, raceID, memberID)
	return err
}

// MemberResult est le résultat d'un adhérent sur une course, vu depuis son
// profil : les infos de la course (titre, date, distance) sont incluses pour
// ne pas nécessiter d'appel supplémentaire.
type MemberResult struct {
	RaceID                   int64     `json:"raceId"`
	RaceTitre                string    `json:"raceTitre"`
	RaceDate                 time.Time `json:"raceDate"`
	DistanceKm               float64   `json:"distanceKm"`
	TempsSecondes            int       `json:"tempsSecondes"`
	AllureKmh                float64   `json:"allureKmh"`
	ClassementGeneral        *int      `json:"classementGeneral"`
	ClassementGeneralTotal   *int      `json:"classementGeneralTotal"`
	Categorie                string    `json:"categorie"`
	ClassementCategorie      *int      `json:"classementCategorie"`
	ClassementCategorieTotal *int      `json:"classementCategorieTotal"`
}

// ResultsByMember retourne les résultats d'un adhérent, du plus récent au
// plus ancien. limit <= 0 retourne tout l'historique.
func (r *Repository) ResultsByMember(memberID int64, limit int) ([]MemberResult, error) {
	query := `
		SELECT rz.race_id, ra.titre, ra.race_date, ra.distance_km,
			rz.temps_secondes, rz.classement_general, rz.classement_general_total,
			rz.categorie, rz.classement_categorie, rz.classement_categorie_total
		FROM race_results rz
		JOIN races ra ON ra.id = rz.race_id
		WHERE rz.member_id = ?
		ORDER BY ra.race_date DESC`
	args := []any{memberID}
	if limit > 0 {
		query += ` LIMIT ?`
		args = append(args, limit)
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := []MemberResult{}
	for rows.Next() {
		var mr MemberResult
		if err := rows.Scan(
			&mr.RaceID, &mr.RaceTitre, &mr.RaceDate, &mr.DistanceKm,
			&mr.TempsSecondes, &mr.ClassementGeneral, &mr.ClassementGeneralTotal,
			&mr.Categorie, &mr.ClassementCategorie, &mr.ClassementCategorieTotal,
		); err != nil {
			return nil, err
		}
		if mr.DistanceKm > 0 && mr.TempsSecondes > 0 {
			mr.AllureKmh = mr.DistanceKm / (float64(mr.TempsSecondes) / 3600.0)
		}
		results = append(results, mr)
	}
	return results, rows.Err()
}

// UpcomingRacesByMember retourne les courses futures auxquelles un adhérent
// est inscrit, par date croissante.
func (r *Repository) UpcomingRacesByMember(memberID int64) ([]Race, error) {
	rows, err := r.db.Query(`
		SELECT `+raceColumns+`
		FROM races r
		JOIN members m ON m.id = r.created_by
		JOIN race_registrations rr ON rr.race_id = r.id
		WHERE rr.member_id = ? AND r.race_date >= CURDATE()
		ORDER BY r.race_date ASC`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	races := []Race{}
	for rows.Next() {
		race, err := scanRace(rows.Scan)
		if err != nil {
			return nil, err
		}
		races = append(races, *race)
	}
	return races, rows.Err()
}

type Handler struct {
	repo       *Repository
	memberRepo *member.Repository
}

func NewHandler(repo *Repository, memberRepo *member.Repository) *Handler {
	return &Handler{repo: repo, memberRepo: memberRepo}
}

// canEnterResults vérifie en base que l'adhérent dispose explicitement du
// droit de saisie des résultats. Contrairement à canUpload (documents), ce
// droit n'est PAS accordé automatiquement aux membres du bureau : il doit
// être activé individuellement depuis l'écran Fonctionnalités, même pour un
// membre du bureau — c'est volontairement une capacité plus restreinte que
// le statut de bureau en lui-même.
func (h *Handler) canEnterResults(memberID int64) (bool, error) {
	m, err := h.memberRepo.GetByID(memberID)
	if err != nil {
		return false, err
	}
	return m.DroitSaisieResultats, nil
}

func decodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	viewerID, _ := member.MemberIDFromContext(r.Context())
	races, err := h.repo.List(viewerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les courses")
		return
	}
	httpx.JSON(w, http.StatusOK, races)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	var rc RaceCreate
	if err := decodeJSON(r, &rc); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if rc.Titre == "" || rc.Date == "" {
		httpx.Error(w, http.StatusBadRequest, "le titre et la date sont obligatoires")
		return
	}

	id, err := h.repo.Create(memberID, rc)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de créer la course")
		return
	}

	race, err := h.repo.GetByID(id, memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusCreated, race)
}

func (h *Handler) GetDetail(w http.ResponseWriter, r *http.Request) {
	viewerID, _ := member.MemberIDFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}

	race, err := h.repo.GetByID(id, viewerID)
	if err == sql.ErrNoRows {
		httpx.Error(w, http.StatusNotFound, "course introuvable")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	participants, err := h.repo.Participants(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	seeking, err := h.repo.DossardSignals(id, dossardKindRecherche)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	ceding, err := h.repo.DossardSignals(id, dossardKindCession)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	isSeeking, err := h.repo.DossardIsSignaled(id, viewerID, dossardKindRecherche)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	isCeding, err := h.repo.DossardIsSignaled(id, viewerID, dossardKindCession)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	results, err := h.repo.Results(id, race.DistanceKm)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	canEnterResults, err := h.canEnterResults(viewerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"race":            race,
		"participants":    participants,
		"seekingDossard":  seeking,
		"cedingDossard":   ceding,
		"isSeekingByMe":   isSeeking,
		"isCedingByMe":    isCeding,
		"results":         results,
		"canEnterResults": canEnterResults,
	})
}

// UpsertResult crée ou met à jour le résultat d'un adhérent sur une course —
// réservé au bureau ou aux adhérents ayant le droit de saisie des résultats.
func (h *Handler) UpsertResult(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	allowed, err := h.canEnterResults(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if !allowed {
		httpx.Error(w, http.StatusForbidden, "vous n'avez pas le droit de saisir des résultats")
		return
	}
	raceID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant de course invalide")
		return
	}
	targetMemberID, err := strconv.ParseInt(r.PathValue("memberId"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant d'adhérent invalide")
		return
	}
	var in RaceResultInput
	if err := decodeJSON(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if in.TempsSecondes <= 0 {
		httpx.Error(w, http.StatusBadRequest, "le temps est obligatoire")
		return
	}
	if err := h.repo.UpsertResult(raceID, targetMemberID, memberID, in); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le résultat")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

// DeleteResult supprime le résultat d'un adhérent sur une course — réservé
// au bureau ou aux adhérents ayant le droit de saisie des résultats.
func (h *Handler) DeleteResult(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	allowed, err := h.canEnterResults(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if !allowed {
		httpx.Error(w, http.StatusForbidden, "vous n'avez pas le droit de supprimer des résultats")
		return
	}
	raceID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant de course invalide")
		return
	}
	targetMemberID, err := strconv.ParseInt(r.PathValue("memberId"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant d'adhérent invalide")
		return
	}
	if err := h.repo.DeleteResult(raceID, targetMemberID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de supprimer le résultat")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	ceding, err := h.repo.DossardIsSignaled(id, memberID, dossardKindCession)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if ceding {
		httpx.Error(w, http.StatusConflict, "annule d'abord ta cession de dossard avant de participer à nouveau")
		return
	}
	if err := h.repo.Register(id, memberID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de s'inscrire à la course")
		return
	}
	// On a désormais une place : inutile de continuer à chercher un dossard.
	_ = h.repo.DossardUnsignal(id, memberID, dossardKindRecherche)
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) Unregister(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	if err := h.repo.Unregister(id, memberID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de se désinscrire de la course")
		return
	}
	// Sans inscription, plus de dossard à céder.
	_ = h.repo.DossardUnsignal(id, memberID, dossardKindCession)
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) dossardUnsignalHandler(kind string, errMsg string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		memberID, ok := member.MemberIDFromContext(r.Context())
		if !ok {
			httpx.Error(w, http.StatusUnauthorized, "non authentifié")
			return
		}
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
			return
		}
		if err := h.repo.DossardUnsignal(id, memberID, kind); err != nil {
			httpx.Error(w, http.StatusInternalServerError, errMsg)
			return
		}
		httpx.JSON(w, http.StatusNoContent, nil)
	}
}

// SeekDossard indique qu'un adhérent recherche un dossard pour une course —
// refusé s'il y est déjà inscrit (il n'en a pas besoin).
func (h *Handler) SeekDossard(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	registered, err := h.repo.IsRegistered(id, memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if registered {
		httpx.Error(w, http.StatusConflict, "tu participes déjà à cette course, inutile de chercher un dossard")
		return
	}
	ceding, err := h.repo.DossardIsSignaled(id, memberID, dossardKindCession)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if ceding {
		httpx.Error(w, http.StatusConflict, "annule d'abord ta cession de dossard avant d'en chercher un autre")
		return
	}
	if err := h.repo.DossardSignal(id, memberID, dossardKindRecherche); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer ta recherche de dossard")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) UnseekDossard(w http.ResponseWriter, r *http.Request) {
	h.dossardUnsignalHandler(dossardKindRecherche, "impossible d'annuler ta recherche de dossard")(w, r)
}

// CedeDossard indique qu'un adhérent cherche à céder son dossard — refusé
// s'il n'est pas inscrit à la course (il n'a pas de dossard à céder).
func (h *Handler) CedeDossard(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	registered, err := h.repo.IsRegistered(id, memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if !registered {
		httpx.Error(w, http.StatusConflict, "tu dois être inscrit à cette course pour céder ton dossard")
		return
	}
	if err := h.repo.DossardSignal(id, memberID, dossardKindCession); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer ta cession de dossard")
		return
	}
	// Céder son dossard, c'est ne plus participer : on sort de la liste des inscrits.
	if err := h.repo.Unregister(id, memberID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) UncedeDossard(w http.ResponseWriter, r *http.Request) {
	h.dossardUnsignalHandler(dossardKindCession, "impossible d'annuler ta cession de dossard")(w, r)
}

// MemberResults retourne l'historique de résultats d'un adhérent (le sien ou
// celui d'un autre — ouvert à tous les adhérents connectés, comme le reste
// des informations de course). ?limit=N limite au N plus récents.
func (h *Handler) MemberResults(w http.ResponseWriter, r *http.Request) {
	if _, ok := member.MemberIDFromContext(r.Context()); !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	targetID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	limit := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		limit, _ = strconv.Atoi(v)
	}
	results, err := h.repo.ResultsByMember(targetID, limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, results)
}

// MemberUpcomingRaces retourne les courses à venir auxquelles un adhérent
// est inscrit.
func (h *Handler) MemberUpcomingRaces(w http.ResponseWriter, r *http.Request) {
	if _, ok := member.MemberIDFromContext(r.Context()); !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	targetID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	races, err := h.repo.UpcomingRacesByMember(targetID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, races)
}

// ClubRecord est une performance d'adhérent candidate à un record — les
// records du club ne sont pas saisis à part : ils sont calculés à la volée
// à partir des résultats de courses déjà enregistrés (race_results).
type ClubRecord struct {
	RaceID        int64     `json:"raceId"`
	RaceTitre     string    `json:"raceTitre"`
	RaceDate      time.Time `json:"raceDate"`
	Type          string    `json:"type"`
	DistanceKm    float64   `json:"distanceKm"`
	MemberID      int64     `json:"memberId"`
	Prenom        string    `json:"prenom"`
	Nom           string    `json:"nom"`
	PhotoURL      string    `json:"photoUrl"`
	TempsSecondes int       `json:"tempsSecondes"`
	AllureKmh     float64   `json:"allureKmh"`
	Categorie     string    `json:"categorie"`
	Genre         string    `json:"genre"` // "homme" ou "femme", déduit du suffixe H/F de la catégorie FFA
}

// genreFromCategorie déduit le genre à partir du suffixe conventionnel des
// catégories FFA (ex: SEH, M2H -> homme ; SEF, M2F -> femme). Renvoie une
// chaîne vide si la catégorie ne suit pas cette convention.
func genreFromCategorie(categorie string) string {
	c := strings.ToUpper(strings.TrimSpace(categorie))
	switch {
	case strings.HasSuffix(c, "H"):
		return "homme"
	case strings.HasSuffix(c, "F"):
		return "femme"
	default:
		return ""
	}
}

// timedResults retourne tous les résultats chronométrés (temps renseigné)
// avec le contexte nécessaire au calcul des records.
func (r *Repository) timedResults() ([]ClubRecord, error) {
	rows, err := r.db.Query(`
		SELECT rz.race_id, ra.titre, ra.race_date, ra.type, ra.distance_km,
			rz.member_id, m.prenom, m.nom, m.photo_path, rz.temps_secondes, rz.categorie
		FROM race_results rz
		JOIN races ra ON ra.id = rz.race_id
		JOIN members m ON m.id = rz.member_id
		WHERE rz.temps_secondes > 0`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := []ClubRecord{}
	for rows.Next() {
		var cr ClubRecord
		if err := rows.Scan(
			&cr.RaceID, &cr.RaceTitre, &cr.RaceDate, &cr.Type, &cr.DistanceKm,
			&cr.MemberID, &cr.Prenom, &cr.Nom, &cr.PhotoURL, &cr.TempsSecondes, &cr.Categorie,
		); err != nil {
			return nil, err
		}
		cr.Genre = genreFromCategorie(cr.Categorie)
		if cr.DistanceKm > 0 {
			cr.AllureKmh = cr.DistanceKm / (float64(cr.TempsSecondes) / 3600.0)
		}
		results = append(results, cr)
	}
	return results, rows.Err()
}

// bestPerKey ne garde que la meilleure performance (temps le plus faible)
// par clé de groupement.
func bestPerKey(all []ClubRecord, keyOf func(ClubRecord) (string, bool)) []ClubRecord {
	best := map[string]ClubRecord{}
	for _, c := range all {
		key, ok := keyOf(c)
		if !ok {
			continue
		}
		if existing, found := best[key]; !found || c.TempsSecondes < existing.TempsSecondes {
			best[key] = c
		}
	}
	out := make([]ClubRecord, 0, len(best))
	for _, v := range best {
		out = append(out, v)
	}
	return out
}

// ClubRecords calcule les records du club à partir des résultats de courses
// enregistrés : meilleur temps par (type de course, genre) et par (type de
// course, catégorie FFA), plus un hit-parade des meilleures allures tous
// types confondus.
func (h *Handler) ClubRecords(w http.ResponseWriter, r *http.Request) {
	if _, ok := member.MemberIDFromContext(r.Context()); !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	all, err := h.repo.timedResults()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	byType := bestPerKey(all, func(c ClubRecord) (string, bool) {
		if c.Type == "" || c.Genre == "" {
			return "", false
		}
		return c.Type + "|" + c.Genre, true
	})
	sort.Slice(byType, func(i, j int) bool {
		if byType[i].Type != byType[j].Type {
			return byType[i].Type < byType[j].Type
		}
		return byType[i].Genre < byType[j].Genre
	})

	byCategory := bestPerKey(all, func(c ClubRecord) (string, bool) {
		if c.Type == "" || c.Categorie == "" {
			return "", false
		}
		return c.Type + "|" + c.Categorie, true
	})
	sort.Slice(byCategory, func(i, j int) bool {
		if byCategory[i].Type != byCategory[j].Type {
			return byCategory[i].Type < byCategory[j].Type
		}
		return byCategory[i].Categorie < byCategory[j].Categorie
	})

	hitParade := make([]ClubRecord, 0, len(all))
	for _, c := range all {
		if c.AllureKmh > 0 {
			hitParade = append(hitParade, c)
		}
	}
	sort.Slice(hitParade, func(i, j int) bool { return hitParade[i].AllureKmh > hitParade[j].AllureKmh })
	if len(hitParade) > 20 {
		hitParade = hitParade[:20]
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"byType":     byType,
		"byCategory": byCategory,
		"hitParade":  hitParade,
	})
}

// ---------------------------------------------------------------------------
// Vues publiques (site vitrine) : aucune donnée nominative, jamais.

// PublicRace est une course à venir vue depuis le site public.
type PublicRace struct {
	ID            int64     `json:"id"`
	Titre         string    `json:"titre"`
	Date          time.Time `json:"date"`
	Type          string    `json:"type"`
	DistanceKm    float64   `json:"distanceKm"`
	SiteInternet  string    `json:"siteInternet"`
	InscritsCount int       `json:"inscritsCount"`
}

// PublicRaces liste les courses à venir auxquelles au moins `min` adhérents
// sont inscrits (1 par défaut), par date croissante.
func (h *Handler) PublicRaces(w http.ResponseWriter, r *http.Request) {
	min := 1
	if v, err := strconv.Atoi(r.URL.Query().Get("min")); err == nil && v > 0 {
		min = v
	}
	rows, err := h.repo.db.Query(`
		SELECT r.id, r.titre, r.race_date, r.type, r.distance_km, r.site_internet,
			(SELECT COUNT(*) FROM race_registrations rr WHERE rr.race_id = r.id) AS n
		FROM races r
		WHERE r.race_date >= CURDATE()
		HAVING n >= ?
		ORDER BY r.race_date ASC, r.titre ASC`, min)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	defer rows.Close()

	out := []PublicRace{}
	for rows.Next() {
		var p PublicRace
		if err := rows.Scan(&p.ID, &p.Titre, &p.Date, &p.Type, &p.DistanceKm, &p.SiteInternet, &p.InscritsCount); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
			return
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// PublicResult résume une course passée : combien d'adhérents classés et le
// meilleur classement général obtenu par l'un d'eux, sans l'identifier.
type PublicResult struct {
	ID            int64     `json:"id"`
	Titre         string    `json:"titre"`
	Date          time.Time `json:"date"`
	Type          string    `json:"type"`
	DistanceKm    float64   `json:"distanceKm"`
	SiteInternet  string    `json:"siteInternet"`
	ClassesSam    int       `json:"classesSam"`
	MeilleurRang  *int      `json:"meilleurRang"`
	MeilleurTotal *int      `json:"meilleurTotal"`
}

// PublicResults liste les courses des 12 derniers mois pour lesquelles des
// résultats ont été saisis, de la plus récente à la plus ancienne.
func (h *Handler) PublicResults(w http.ResponseWriter, r *http.Request) {
	rows, err := h.repo.db.Query(`
		SELECT r.id, r.titre, r.race_date, r.type, r.distance_km, r.site_internet,
			(SELECT COUNT(*) FROM race_results rz WHERE rz.race_id = r.id) AS n,
			(SELECT rz.classement_general FROM race_results rz
				WHERE rz.race_id = r.id AND rz.classement_general IS NOT NULL
				ORDER BY rz.classement_general ASC LIMIT 1),
			(SELECT rz.classement_general_total FROM race_results rz
				WHERE rz.race_id = r.id AND rz.classement_general IS NOT NULL
				ORDER BY rz.classement_general ASC LIMIT 1)
		FROM races r
		WHERE r.race_date < CURDATE() AND r.race_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
		HAVING n > 0
		ORDER BY r.race_date DESC, r.titre ASC`)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	defer rows.Close()

	out := []PublicResult{}
	for rows.Next() {
		var p PublicResult
		if err := rows.Scan(&p.ID, &p.Titre, &p.Date, &p.Type, &p.DistanceKm, &p.SiteInternet, &p.ClassesSam, &p.MeilleurRang, &p.MeilleurTotal); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
			return
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// PublicRecord est le meilleur temps du club sur une épreuve et un genre,
// sans le nom du détenteur (comme sur le site actuel du club).
type PublicRecord struct {
	Epreuve       string    `json:"epreuve"`
	Genre         string    `json:"genre"`
	TempsSecondes int       `json:"tempsSecondes"`
	RaceTitre     string    `json:"raceTitre"`
	RaceDate      time.Time `json:"raceDate"`
}

// recordEpreuves : seules les épreuves à distance fixe donnent des records
// comparables (un trail ou un cross n'a pas de distance standard).
var recordEpreuves = map[string]bool{
	"5 km route": true, "10 km route": true, "15 km route": true, "20 km route": true,
	"Semi-marathon": true, "Marathon": true, "50 km": true, "100 km": true,
}

// PublicRecords calcule les records du club à partir des résultats saisis.
func (h *Handler) PublicRecords(w http.ResponseWriter, r *http.Request) {
	all, err := h.repo.timedResults()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	best := bestPerKey(all, func(c ClubRecord) (string, bool) {
		if !recordEpreuves[c.Type] || c.Genre == "" {
			return "", false
		}
		return c.Type + "|" + c.Genre, true
	})
	out := make([]PublicRecord, 0, len(best))
	for _, c := range best {
		out = append(out, PublicRecord{Epreuve: c.Type, Genre: c.Genre, TempsSecondes: c.TempsSecondes, RaceTitre: c.RaceTitre, RaceDate: c.RaceDate})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Epreuve != out[j].Epreuve {
			return out[i].Epreuve < out[j].Epreuve
		}
		return out[i].Genre < out[j].Genre
	})
	httpx.JSON(w, http.StatusOK, out)
}
