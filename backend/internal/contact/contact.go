package contact

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"samparis12/backend/internal/httpx"
)

type Message struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Save(m Message) error {
	_, err := r.db.Exec(`
		INSERT INTO contact_messages (name, email, subject, message)
		VALUES (?, ?, ?, ?)`, m.Name, m.Email, m.Subject, m.Message)
	return err
}

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	var m Message
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		httpx.Error(w, http.StatusBadRequest, "message invalide")
		return
	}

	m.Name = strings.TrimSpace(m.Name)
	m.Email = strings.TrimSpace(m.Email)
	m.Subject = strings.TrimSpace(m.Subject)
	m.Message = strings.TrimSpace(m.Message)

	if m.Name == "" || m.Email == "" || m.Message == "" || !strings.Contains(m.Email, "@") {
		httpx.Error(w, http.StatusBadRequest, "merci de renseigner votre nom, un email valide et un message")
		return
	}

	if err := h.repo.Save(m); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'envoyer le message")
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]string{"status": "ok"})
}
