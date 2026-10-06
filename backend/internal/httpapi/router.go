package httpapi

import (
	"database/sql"
	"net/http"

	"samparis12/backend/internal/chat"
	"samparis12/backend/internal/config"
	"samparis12/backend/internal/contact"
	"samparis12/backend/internal/document"
	"samparis12/backend/internal/event"
	"samparis12/backend/internal/game"
	"samparis12/backend/internal/group"
	"samparis12/backend/internal/mailer"
	"samparis12/backend/internal/member"
	"samparis12/backend/internal/news"
	"samparis12/backend/internal/partner"
	"samparis12/backend/internal/race"

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
	memberHandler := member.NewHandler(member.NewRepository(db), memberMailer, authService, cfg.FrontendURL)
	raceHandler := race.NewHandler(race.NewRepository(db), member.NewRepository(db))
	documentHandler := document.NewHandler(document.NewRepository(db), member.NewRepository(db))
	gameHandler := game.NewHandler(game.NewRepository(db))
	chatHandler := chat.NewHandler(chat.NewRepository(db, cfg.JWTSecret))

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
	mux.HandleFunc("POST /api/auth/verify-code", memberHandler.VerifyCode)
	mux.HandleFunc("POST /api/auth/confirm-code", memberHandler.ConfirmCode)

	mux.HandleFunc("GET /api/members", authService.RequireAuth(memberHandler.ListPublic))
	mux.HandleFunc("GET /api/members/me", authService.RequireAuth(memberHandler.Me))
	mux.HandleFunc("PUT /api/members/me", authService.RequireAuth(memberHandler.UpdateMe))
	mux.HandleFunc("PUT /api/members/me/email", authService.RequireAuth(memberHandler.UpdateEmail))
	mux.HandleFunc("PUT /api/members/me/trombi", authService.RequireAuth(memberHandler.UpdateTrombi))
	mux.HandleFunc("POST /api/members/me/photo", authService.RequireAuth(memberHandler.UploadPhoto))

	mux.HandleFunc("GET /api/admin/members", authService.RequireBureau(memberHandler.AdminListMembers))
	mux.HandleFunc("POST /api/admin/members", authService.RequireBureau(memberHandler.AdminCreateMember))
	mux.HandleFunc("GET /api/admin/members/{id}", authService.RequireBureau(memberHandler.AdminGetMember))
	mux.HandleFunc("PUT /api/admin/members/{id}", authService.RequireBureau(memberHandler.AdminUpdateMember))
	mux.HandleFunc("PUT /api/admin/members/{id}/email", authService.RequireBureau(memberHandler.AdminUpdateEmail))
	mux.HandleFunc("DELETE /api/admin/members/{id}", authService.RequireBureau(memberHandler.AdminDeleteMember))
	mux.HandleFunc("POST /api/admin/members/{id}/send-welcome-email", authService.RequireBureau(memberHandler.AdminSendWelcomeEmail))
	mux.HandleFunc("POST /api/admin/members/{id}/generate-code", authService.RequireBureau(memberHandler.AdminGenerateCode))

	mux.HandleFunc("GET /api/races", authService.RequireAuth(raceHandler.List))
	mux.HandleFunc("POST /api/races", authService.RequireAuth(raceHandler.Create))
	mux.HandleFunc("GET /api/races/{id}", authService.RequireAuth(raceHandler.GetDetail))
	mux.HandleFunc("POST /api/races/{id}/register", authService.RequireAuth(raceHandler.Register))
	mux.HandleFunc("DELETE /api/races/{id}/register", authService.RequireAuth(raceHandler.Unregister))
	mux.HandleFunc("POST /api/races/{id}/dossard/recherche", authService.RequireAuth(raceHandler.SeekDossard))
	mux.HandleFunc("DELETE /api/races/{id}/dossard/recherche", authService.RequireAuth(raceHandler.UnseekDossard))
	mux.HandleFunc("POST /api/races/{id}/dossard/cession", authService.RequireAuth(raceHandler.CedeDossard))
	mux.HandleFunc("DELETE /api/races/{id}/dossard/cession", authService.RequireAuth(raceHandler.UncedeDossard))
	mux.HandleFunc("PUT /api/races/{id}/results/{memberId}", authService.RequireAuth(raceHandler.UpsertResult))
	mux.HandleFunc("DELETE /api/races/{id}/results/{memberId}", authService.RequireAuth(raceHandler.DeleteResult))
	mux.HandleFunc("GET /api/members/{id}/race-results", authService.RequireAuth(raceHandler.MemberResults))
	mux.HandleFunc("GET /api/members/{id}/upcoming-races", authService.RequireAuth(raceHandler.MemberUpcomingRaces))
	mux.HandleFunc("GET /api/records", authService.RequireAuth(raceHandler.ClubRecords))

	// Vues publiques du site vitrine (sans authentification, sans donnée nominative).
	mux.HandleFunc("GET /api/public/races", raceHandler.PublicRaces)
	mux.HandleFunc("GET /api/public/results", raceHandler.PublicResults)
	mux.HandleFunc("GET /api/public/records", raceHandler.PublicRecords)
	mux.HandleFunc("GET /api/public/stats", memberHandler.PublicStats)

	// Mini-jeu « SAM Run » : classement réservé aux adhérents connectés.
	mux.HandleFunc("GET /api/game/leaderboard", authService.RequireAuth(gameHandler.Leaderboard))
	mux.HandleFunc("POST /api/game/score", authService.RequireAuth(gameHandler.SubmitScore))

	// Messagerie de l'espace adhérent (salons par groupe, salons créés, messages privés).
	mux.HandleFunc("GET /api/chat/stream", authService.RequireAuth(chatHandler.Stream))
	mux.HandleFunc("GET /api/chat/rooms", authService.RequireAuth(chatHandler.Rooms))
	mux.HandleFunc("POST /api/chat/rooms", authService.RequireAuth(chatHandler.CreateRoom))
	mux.HandleFunc("POST /api/chat/dm", authService.RequireAuth(chatHandler.OpenDM))
	mux.HandleFunc("GET /api/chat/rooms/{id}/messages", authService.RequireAuth(chatHandler.Messages))
	mux.HandleFunc("POST /api/chat/rooms/{id}/messages", authService.RequireAuth(chatHandler.Send))
	mux.HandleFunc("POST /api/chat/rooms/{id}/attachments", authService.RequireAuth(chatHandler.SendMedia))
	mux.HandleFunc("POST /api/chat/rooms/{id}/polls", authService.RequireAuth(chatHandler.SendPoll))
	mux.HandleFunc("POST /api/chat/rooms/{id}/events", authService.RequireAuth(chatHandler.SendEvent))
	mux.HandleFunc("POST /api/chat/messages/{id}/vote", authService.RequireAuth(chatHandler.Vote))
	mux.HandleFunc("POST /api/chat/messages/{id}/rsvp", authService.RequireAuth(chatHandler.RSVP))
	mux.HandleFunc("GET /api/chat/files/{id}", chatHandler.File) // lien signé : pas d'en-tête Authorization
	mux.HandleFunc("POST /api/chat/rooms/{id}/read", authService.RequireAuth(chatHandler.Read))
	mux.HandleFunc("POST /api/chat/rooms/{id}/archive", authService.RequireAuth(chatHandler.Archive))
	mux.HandleFunc("DELETE /api/chat/rooms/{id}", authService.RequireAuth(chatHandler.DeleteRoom))
	mux.HandleFunc("POST /api/chat/rooms/{id}/members", authService.RequireAuth(chatHandler.AddMembers))
	mux.HandleFunc("PUT /api/chat/messages/{id}", authService.RequireAuth(chatHandler.Edit))
	mux.HandleFunc("DELETE /api/chat/messages/{id}", authService.RequireAuth(chatHandler.Delete))

	mux.HandleFunc("GET /api/documents", authService.RequireAuth(documentHandler.List))
	mux.HandleFunc("POST /api/documents", authService.RequireAuth(documentHandler.Upload))

	// Photos de trombinoscope et documents du club, servis tels quels (pas
	// de donnée sensible).
	mux.Handle("GET /uploads/photos/", http.StripPrefix("/uploads/photos/", http.FileServer(http.Dir("uploads/photos"))))
	mux.Handle("GET /uploads/documents/", http.StripPrefix("/uploads/documents/", http.FileServer(http.Dir("uploads/documents"))))

	return httpx.CORS(cfg.FrontendURL, mux)
}
