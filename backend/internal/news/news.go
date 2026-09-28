package news

import (
	"database/sql"
	"net/http"
	"time"

	"samparis12/backend/internal/httpx"
)

type Article struct {
	ID          int64      `json:"id"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Excerpt     string     `json:"excerpt"`
	Content     string     `json:"content"`
	CoverImage  string     `json:"coverImage"`
	PublishedAt *time.Time `json:"publishedAt"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(limit int) ([]Article, error) {
	rows, err := r.db.Query(`
		SELECT id, title, slug, excerpt, content, cover_image, published_at
		FROM news
		WHERE published_at IS NOT NULL AND published_at <= NOW()
		ORDER BY published_at DESC
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	articles := []Article{}
	for rows.Next() {
		var a Article
		if err := rows.Scan(&a.ID, &a.Title, &a.Slug, &a.Excerpt, &a.Content, &a.CoverImage, &a.PublishedAt); err != nil {
			return nil, err
		}
		articles = append(articles, a)
	}
	return articles, rows.Err()
}

func (r *Repository) GetBySlug(slug string) (*Article, error) {
	var a Article
	err := r.db.QueryRow(`
		SELECT id, title, slug, excerpt, content, cover_image, published_at
		FROM news
		WHERE slug = ? AND published_at IS NOT NULL AND published_at <= NOW()`, slug).
		Scan(&a.ID, &a.Title, &a.Slug, &a.Excerpt, &a.Content, &a.CoverImage, &a.PublishedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit := 20
	articles, err := h.repo.List(limit)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les actualités")
		return
	}
	httpx.JSON(w, http.StatusOK, articles)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	article, err := h.repo.GetBySlug(slug)
	if err == sql.ErrNoRows {
		httpx.Error(w, http.StatusNotFound, "article introuvable")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger l'article")
		return
	}
	httpx.JSON(w, http.StatusOK, article)
}
