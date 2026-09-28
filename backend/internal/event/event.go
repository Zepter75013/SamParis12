package event

import (
	"database/sql"
	"net/http"
	"time"

	"samparis12/backend/internal/httpx"
)

type Event struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	Category    string    `json:"category"`
	StartAt     time.Time `json:"startAt"`
	EndAt       *time.Time `json:"endAt"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListUpcoming(limit int) ([]Event, error) {
	rows, err := r.db.Query(`
		SELECT id, title, description, location, category, start_at, end_at
		FROM events
		WHERE start_at >= NOW() - INTERVAL 1 DAY
		ORDER BY start_at ASC
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.Title, &e.Description, &e.Location, &e.Category, &e.StartAt, &e.EndAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	events, err := h.repo.ListUpcoming(50)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger le calendrier")
		return
	}
	httpx.JSON(w, http.StatusOK, events)
}
