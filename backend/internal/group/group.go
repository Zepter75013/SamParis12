package group

import (
	"database/sql"
	"net/http"

	"samparis12/backend/internal/httpx"
)

// Group represents a training section (e.g. "Éveil athlétique", "Compétition adultes").
type Group struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	AgeRange    string `json:"ageRange"`
	Level       string `json:"level"`
	Schedule    string `json:"schedule"`
	Coach       string `json:"coach"`
	Description string `json:"description"`
	Image       string `json:"image"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List() ([]Group, error) {
	rows, err := r.db.Query(`
		SELECT id, name, slug, age_range, level, schedule, coach, description, image
		FROM training_groups
		ORDER BY sort_order ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := []Group{}
	for rows.Next() {
		var g Group
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.AgeRange, &g.Level, &g.Schedule, &g.Coach, &g.Description, &g.Image); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, rows.Err()
}

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	groups, err := h.repo.List()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les sections")
		return
	}
	httpx.JSON(w, http.StatusOK, groups)
}
