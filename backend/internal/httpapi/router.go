package httpapi

import (
	"database/sql"
	"net/http"

	"samparis12/backend/internal/config"
	"samparis12/backend/internal/contact"
	"samparis12/backend/internal/event"
	"samparis12/backend/internal/group"
	"samparis12/backend/internal/news"
	"samparis12/backend/internal/partner"

	"samparis12/backend/internal/httpx"
)

func NewRouter(db *sql.DB, cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	newsHandler := news.NewHandler(news.NewRepository(db))
	eventHandler := event.NewHandler(event.NewRepository(db))
	groupHandler := group.NewHandler(group.NewRepository(db))
	partnerHandler := partner.NewHandler(partner.NewRepository(db))
	contactHandler := contact.NewHandler(contact.NewRepository(db))

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /api/news", newsHandler.List)
	mux.HandleFunc("GET /api/news/{slug}", newsHandler.Get)
	mux.HandleFunc("GET /api/events", eventHandler.List)
	mux.HandleFunc("GET /api/groups", groupHandler.List)
	mux.HandleFunc("GET /api/partners", partnerHandler.List)
	mux.HandleFunc("POST /api/contact", contactHandler.Submit)

	return httpx.CORS(cfg.FrontendURL, mux)
}
