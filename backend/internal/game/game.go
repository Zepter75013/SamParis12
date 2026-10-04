// Package game : classement du mini-jeu « SAM Run » (œuf de Pâques), réservé aux adhérents connectés.
package game

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/member"
)

// Au-delà, le score est refusé (tricherie évidente) : à vitesse maximale, 500 000 m représentent plus d'une demi-heure de jeu continu.
const maxMeters = 500000

const topSize = 5

type Entry struct {
	Rang     int    `json:"rang"`
	MemberID int64  `json:"memberId"`
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"` // initiale seulement
	PhotoURL string `json:"photoUrl"`
	Meters   int    `json:"meters"`
}

type Me struct {
	Meters int `json:"meters"`
	Rang   int `json:"rang"`
}

type Leaderboard struct {
	Top []Entry `json:"top"`
	Me  *Me     `json:"me"`
}

type Repository struct{ db *sql.DB }

func NewRepository(db *sql.DB) *Repository { return &Repository{db: db} }

// SaveBest enregistre le score s'il bat le précédent record de l'adhérent.
func (r *Repository) SaveBest(memberID int64, meters int) error {
	_, err := r.db.Exec(`
		INSERT INTO game_scores (member_id, best_meters) VALUES (?, ?) AS new
		ON DUPLICATE KEY UPDATE
			updated_at = IF(new.best_meters > game_scores.best_meters, CURRENT_TIMESTAMP, game_scores.updated_at),
			best_meters = GREATEST(game_scores.best_meters, new.best_meters)`,
		memberID, meters)
	return err
}

func (r *Repository) Board(memberID int64) (*Leaderboard, error) {
	rows, err := r.db.Query(`
		SELECT m.id, m.prenom, m.nom, m.photo_path, g.best_meters
		FROM game_scores g
		JOIN members m ON m.id = g.member_id
		WHERE g.best_meters > 0
		ORDER BY g.best_meters DESC, g.updated_at ASC
		LIMIT ?`, topSize)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lb := &Leaderboard{Top: []Entry{}}
	for rank := 1; rows.Next(); rank++ {
		var e Entry
		var nom string
		if err := rows.Scan(&e.MemberID, &e.Prenom, &nom, &e.PhotoURL, &e.Meters); err != nil {
			return nil, err
		}
		e.Rang = rank
		if r := []rune(nom); len(r) > 0 {
			e.Nom = string(r[0]) + "."
		}
		lb.Top = append(lb.Top, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var best int
	err = r.db.QueryRow(`SELECT best_meters FROM game_scores WHERE member_id = ?`, memberID).Scan(&best)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		return lb, nil
	case err != nil:
		return nil, err
	}
	var better int
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM game_scores WHERE best_meters > ?`, best).Scan(&better); err != nil {
		return nil, err
	}
	lb.Me = &Me{Meters: best, Rang: better + 1}
	return lb, nil
}

type Handler struct{ repo *Repository }

func NewHandler(repo *Repository) *Handler { return &Handler{repo: repo} }

func (h *Handler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	id, _ := member.MemberIDFromContext(r.Context())
	lb, err := h.repo.Board(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger le classement")
		return
	}
	httpx.JSON(w, http.StatusOK, lb)
}

// SubmitScore enregistre le score de la partie qui vient de se terminer, puis renvoie le classement à jour.
func (h *Handler) SubmitScore(w http.ResponseWriter, r *http.Request) {
	id, _ := member.MemberIDFromContext(r.Context())
	var in struct {
		Meters int `json:"meters"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if in.Meters < 0 || in.Meters > maxMeters {
		httpx.Error(w, http.StatusBadRequest, "score invalide")
		return
	}
	if in.Meters > 0 {
		if err := h.repo.SaveBest(id, in.Meters); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le score")
			return
		}
	}
	lb, err := h.repo.Board(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger le classement")
		return
	}
	httpx.JSON(w, http.StatusOK, lb)
}
