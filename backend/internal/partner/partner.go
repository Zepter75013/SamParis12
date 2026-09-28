package partner

import (
	"database/sql"
	"net/http"

	"samparis12/backend/internal/httpx"
)

type Partner struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	LogoURL    string `json:"logoUrl"`
	WebsiteURL string `json:"websiteUrl"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List() ([]Partner, error) {
	rows, err := r.db.Query(`
		SELECT id, name, logo_url, website_url
		FROM partners
		ORDER BY sort_order ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	partners := []Partner{}
	for rows.Next() {
		var p Partner
		if err := rows.Scan(&p.ID, &p.Name, &p.LogoURL, &p.WebsiteURL); err != nil {
			return nil, err
		}
		partners = append(partners, p)
	}
	return partners, rows.Err()
}

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	partners, err := h.repo.List()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les partenaires")
		return
	}
	httpx.JSON(w, http.StatusOK, partners)
}
