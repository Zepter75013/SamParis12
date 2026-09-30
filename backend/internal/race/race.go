package race

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
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
	Description      string    `json:"description"`
	SiteInternet     string    `json:"siteInternet"`
	CreatedBy        int64     `json:"createdBy"`
	CreatedByPrenom  string    `json:"createdByPrenom"`
	CreatedByNom     string    `json:"createdByNom"`
	InscritsCount    int       `json:"inscritsCount"`
	IsRegisteredByMe bool      `json:"isRegisteredByMe"`
}

// RaceCreate est le sous-ensemble de champs fourni par l'adhérent qui crée une course.
type RaceCreate struct {
	Titre        string `json:"titre"`
	Date         string `json:"date"`
	Lieu         string `json:"lieu"`
	Type         string `json:"type"`
	Description  string `json:"description"`
	SiteInternet string `json:"siteInternet"`
}

// Participant est un adhérent inscrit à une course (ou recherchant/cédant un dossard).
type Participant struct {
	MemberID int64  `json:"memberId"`
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"`
	PhotoURL string `json:"photoUrl"`
	Email    string `json:"email"`
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
	r.id, r.titre, r.race_date, r.lieu, r.type, r.description, r.site_internet,
	r.created_by, m.prenom, m.nom,
	(SELECT COUNT(*) FROM race_registrations rr WHERE rr.race_id = r.id)
`

func scanRace(scan func(...any) error) (*Race, error) {
	var race Race
	if err := scan(
		&race.ID, &race.Titre, &race.Date, &race.Lieu, &race.Type, &race.Description, &race.SiteInternet,
		&race.CreatedBy, &race.CreatedByPrenom, &race.CreatedByNom, &race.InscritsCount,
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
		INSERT INTO races (titre, race_date, lieu, type, description, site_internet, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		rc.Titre, rc.Date, rc.Lieu, rc.Type, rc.Description, rc.SiteInternet, memberID,
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

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
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

	httpx.JSON(w, http.StatusOK, map[string]any{
		"race":           race,
		"participants":   participants,
		"seekingDossard": seeking,
		"cedingDossard":  ceding,
		"isSeekingByMe":  isSeeking,
		"isCedingByMe":   isCeding,
	})
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
	if err := h.repo.Register(id, memberID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de s'inscrire à la course")
		return
	}
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
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) dossardSignalHandler(kind string, errMsg string) http.HandlerFunc {
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
		if err := h.repo.DossardSignal(id, memberID, kind); err != nil {
			httpx.Error(w, http.StatusInternalServerError, errMsg)
			return
		}
		httpx.JSON(w, http.StatusNoContent, nil)
	}
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

func (h *Handler) SeekDossard(w http.ResponseWriter, r *http.Request) {
	h.dossardSignalHandler(dossardKindRecherche, "impossible d'enregistrer ta recherche de dossard")(w, r)
}

func (h *Handler) UnseekDossard(w http.ResponseWriter, r *http.Request) {
	h.dossardUnsignalHandler(dossardKindRecherche, "impossible d'annuler ta recherche de dossard")(w, r)
}

func (h *Handler) CedeDossard(w http.ResponseWriter, r *http.Request) {
	h.dossardSignalHandler(dossardKindCession, "impossible d'enregistrer ta cession de dossard")(w, r)
}

func (h *Handler) UncedeDossard(w http.ResponseWriter, r *http.Request) {
	h.dossardUnsignalHandler(dossardKindCession, "impossible d'annuler ta cession de dossard")(w, r)
}
