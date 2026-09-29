package httpapi

import (
	"database/sql"
	"net/http"

	"samparis12/backend/internal/config"
	"samparis12/backend/internal/contact"
	"samparis12/backend/internal/event"
	"samparis12/backend/internal/group"
	"samparis12/backend/internal/mailer"
	"samparis12/backend/internal/member"
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

	authService := member.NewAuthService(cfg.JWTSecret)
	memberMailer := mailer.New(cfg)
	memberHandler := member.NewHandler(member.NewRepository(db), memberMailer, authService)

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /api/news", newsHandler.List)
	mux.HandleFunc("GET /api/news/{slug}", newsHandler.Get)
	mux.HandleFunc("GET /api/events", eventHandler.List)
	mux.HandleFunc("GET /api/groups", groupHandler.List)
	mux.HandleFunc("GET /api/partners", partnerHandler.List)
	mux.HandleFunc("POST /api/contact", contactHandler.Submit)

	mux.HandleFunc("POST /api/auth/login", memberHandler.Login)
	mux.HandleFunc("POST /api/auth/request-code", memberHandler.RequestCode)
	mux.HandleFunc("POST /api/auth/confirm-code", memberHandler.ConfirmCode)

	mux.HandleFunc("GET /api/members", authService.RequireAuth(memberHandler.ListPublic))
	mux.HandleFunc("GET /api/members/me", authService.RequireAuth(memberHandler.Me))
	mux.HandleFunc("PUT /api/members/me", authService.RequireAuth(memberHandler.UpdateMe))
	mux.HandleFunc("PUT /api/members/me/email", authService.RequireAuth(memberHandler.UpdateEmail))
	mux.HandleFunc("POST /api/members/me/photo", authService.RequireAuth(memberHandler.UploadPhoto))

	// Photos de trombinoscope, servies telles quelles (pas de donnée sensible).
	mux.Handle("GET /uploads/photos/", http.StripPrefix("/uploads/photos/", http.FileServer(http.Dir("uploads/photos"))))

	return httpx.CORS(cfg.FrontendURL, mux)
}
