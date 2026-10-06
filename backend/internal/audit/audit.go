// Package audit : journal d'activité de l'application (qui a fait quoi, et si l'action a réussi).
package audit

import (
	"database/sql"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// Retention : durée de conservation du journal.
const Retention = 365 * 24 * time.Hour

// Types d'action du journal.
const (
	KindModification = "modification" // écrit en base
	KindNavigation   = "navigation"   // consultation d'un écran ou d'une liste, export
	KindConnexion    = "connexion"    // connexion, demande de code
)

type Entry struct {
	MemberID int64 // 0 : aucun adhérent identifié
	Nom      string
	Role     string
	Action   string
	Kind     string // KindModification par défaut
	Detail   string
	Success  bool
	Status   int
	IP       string
}

type Logger struct{ db *sql.DB }

func New(db *sql.DB) *Logger { return &Logger{db: db} }

func cut(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n-1]) + "…"
}

// Who : « NOM Prénom » et rôle d'un adhérent.
func (l *Logger) Who(memberID int64) (nom, role string) {
	_ = l.db.QueryRow(`
		SELECT CONCAT(m.nom, ' ', m.prenom), COALESCE(r.nom, '')
		FROM members m LEFT JOIN app_roles r ON r.id = m.role_app_id WHERE m.id = ?`, memberID).Scan(&nom, &role)
	return nom, role
}

// Record enregistre une ligne du journal. Si l'adhérent est connu mais pas son nom, on le retrouve en base.
// Une panne du journal ne doit jamais gêner l'application : l'erreur est seulement signalée dans les journaux du serveur.
func (l *Logger) Record(e Entry) {
	if l == nil {
		return
	}
	if e.MemberID > 0 && e.Nom == "" {
		e.Nom, e.Role = l.Who(e.MemberID)
	}
	var member any
	if e.MemberID > 0 {
		member = e.MemberID
	}
	if e.Kind == "" {
		e.Kind = KindModification
	}
	_, err := l.db.Exec(`INSERT INTO audit_log (member_id, nom, role, action, kind, detail, success, status, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		member, cut(e.Nom, 120), cut(e.Role, 60), cut(e.Action, 120), e.Kind, cut(e.Detail, 255), e.Success, e.Status, cut(e.IP, 45))
	if err != nil {
		log.Printf("audit: %v", err)
	}
}

// ClientIP : adresse du client (derrière le proxy Caddy / nginx : premier élément de X-Forwarded-For).
func ClientIP(r *http.Request) string {
	if x := r.Header.Get("X-Forwarded-For"); x != "" {
		return strings.TrimSpace(strings.Split(x, ",")[0])
	}
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

// PurgeLoop supprime les lignes plus anciennes que la durée de conservation, au démarrage puis chaque jour.
func (l *Logger) PurgeLoop() {
	for {
		if _, err := l.db.Exec(`DELETE FROM audit_log WHERE created_at < ?`, time.Now().Add(-Retention)); err != nil {
			log.Printf("audit: purge : %v", err)
		}
		time.Sleep(24 * time.Hour)
	}
}

// ---- Middleware : journalise les actions de la table des routes ----

type route struct {
	action string
	detail string // member | race | role | room | message-room | race-member | ""
}

// Routes journalisées (motif du ServeMux → libellé). Les lectures courantes, les accusés de lecture de la messagerie et le
// flux temps réel n'y figurent pas.
var routes = map[string]route{
	"PUT /api/members/me":                             {"Modification de ses informations personnelles", ""},
	"PUT /api/members/me/email":                       {"Changement de sa propre adresse email", ""},
	"PUT /api/members/me/preferences":                 {"Changement de ses préférences d'affichage (menu)", ""},
	"PUT /api/members/me/trombi":                      {"Modification de sa fiche trombinoscope", ""},
	"POST /api/members/me/photo":                      {"Changement de sa photo", ""},
	"GET /api/admin/members":                          {"Consultation de la liste des adhérents (administration)", ""},
	"GET /api/admin/members/{id}":                     {"Consultation de la fiche d'un adhérent (administration)", "member"},
	"POST /api/admin/members":                         {"Création d'un adhérent", ""},
	"PUT /api/admin/members/{id}":                     {"Modification de la fiche d'un adhérent", "member"},
	"PUT /api/admin/members/{id}/email":               {"Changement de l'adresse email d'un adhérent", "member"},
	"DELETE /api/admin/members/{id}":                  {"Suppression d'un adhérent", "member"},
	"POST /api/admin/members/{id}/send-welcome-email": {"Envoi de l'email de bienvenue", "member"},
	"POST /api/admin/members/{id}/generate-code":      {"Génération d'un code d'accès pour un adhérent", "member"},
	"GET /api/stats/effectifs":                        {"Consultation des statistiques : effectifs", ""},
	"GET /api/stats/courses":                          {"Consultation des statistiques : courses (assiduité nominative)", ""},
	"GET /api/stats/courses/assiduite.csv":            {"Export CSV de l'assiduité aux courses", ""},
	"GET /api/stats/engagement":                       {"Consultation des statistiques : engagement (fiches incomplètes)", ""},
	"GET /api/stats/engagement/fiches.csv":            {"Export CSV des fiches adhérents incomplètes", ""},
	"POST /api/strava/callback":                       {"Liaison de son compte Strava", ""},
	"DELETE /api/strava":                              {"Déconnexion de son compte Strava", ""},
	"GET /api/strava/activities":                      {"Consultation de ses activités Strava", ""},
	"POST /api/roles":                                 {"Création d'un rôle", ""},
	"PUT /api/roles/{id}":                             {"Modification d'un rôle et de ses fonctionnalités", "role"},
	"DELETE /api/roles/{id}":                          {"Suppression d'un rôle", "role"},
	"POST /api/races":                                 {"Création d'une course", ""},
	"POST /api/races/{id}/register":                   {"Inscription à une course", "race"},
	"DELETE /api/races/{id}/register":                 {"Désinscription d'une course", "race"},
	"POST /api/races/{id}/dossard/recherche":          {"Recherche d'un dossard", "race"},
	"DELETE /api/races/{id}/dossard/recherche":        {"Fin de recherche d'un dossard", "race"},
	"POST /api/races/{id}/dossard/cession":            {"Cession d'un dossard", "race"},
	"DELETE /api/races/{id}/dossard/cession":          {"Annulation de cession d'un dossard", "race"},
	"PUT /api/races/{id}/results/{memberId}":          {"Saisie d'un résultat de course", "race-member"},
	"DELETE /api/races/{id}/results/{memberId}":       {"Suppression d'un résultat de course", "race-member"},
	"POST /api/documents":                             {"Ajout d'un document", ""},
	"POST /api/game/score":                            {"Score enregistré au jeu SAM Run", ""},
	"POST /api/contact":                               {"Message envoyé par le formulaire de contact", ""},
	"POST /api/chat/rooms":                            {"Création d'un salon de discussion", ""},
	"POST /api/chat/dm":                               {"Ouverture d'un message privé", ""},
	"POST /api/chat/rooms/{id}/messages":              {"Envoi d'un message", "room"},
	"POST /api/chat/rooms/{id}/attachments":           {"Envoi de photos, vidéos ou documents", "room"},
	"POST /api/chat/rooms/{id}/polls":                 {"Création d'un sondage", "room"},
	"POST /api/chat/rooms/{id}/events":                {"Création d'un événement dans une discussion", "room"},
	"POST /api/chat/messages/{id}/vote":               {"Vote à un sondage", "message-room"},
	"POST /api/chat/messages/{id}/rsvp":               {"Réponse à un événement", "message-room"},
	"PUT /api/chat/messages/{id}":                     {"Modification d'un message", "message-room"},
	"DELETE /api/chat/messages/{id}":                  {"Suppression d'un message", "message-room"},
	"POST /api/chat/rooms/{id}/archive":               {"Archivage ou désarchivage d'une discussion", "room"},
	"DELETE /api/chat/rooms/{id}":                     {"Suppression d'une discussion de son écran", "room"},
	"POST /api/chat/rooms/{id}/members":               {"Ajout de participants à un salon", "room"},
	"POST /api/auth/confirm-code":                     {"", ""}, // journalisé explicitement par le gestionnaire (connexion, code)
}

var (
	reMembre = regexp.MustCompile(`^/api/admin/members/(\d+)`)
	reRole   = regexp.MustCompile(`^/api/roles/(\d+)`)
)

type recorder struct {
	http.ResponseWriter
	status int
}

func (r *recorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// Flush et Unwrap : le flux temps réel de la messagerie et les envois de fichiers continuent de fonctionner.
func (r *recorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
func (r *recorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// Wrap journalise, après coup, les requêtes dont le motif figure dans la table des routes. identify renvoie l'adhérent
// connecté (jeton), s'il y en a un.
func Wrap(next http.Handler, l *Logger, identify func(*http.Request) (int64, bool)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Cibles qui disparaissent avec la requête (suppression d'un adhérent ou d'un rôle) : lues avant.
		pre := ""
		if r.Method == http.MethodDelete || r.Method == http.MethodPut {
			if m := reMembre.FindStringSubmatch(r.URL.Path); m != nil {
				pre = l.nomMembre(m[1])
			} else if m := reRole.FindStringSubmatch(r.URL.Path); m != nil {
				pre = l.nomRole(m[1])
			}
		}
		rec := &recorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		ro, ok := routes[r.Pattern]
		if !ok || ro.action == "" {
			return
		}
		e := Entry{Action: ro.action, Status: rec.status, Success: rec.status < 400, IP: ClientIP(r), Kind: KindModification}
		if r.Method == http.MethodGet {
			e.Kind = KindNavigation // une lecture ne modifie rien
		}
		if id, ok := identify(r); ok {
			e.MemberID = id
		}
		switch ro.detail {
		case "member":
			e.Detail = firstNonEmpty(pre, l.nomMembre(r.PathValue("id")))
		case "role":
			e.Detail = firstNonEmpty(pre, l.nomRole(r.PathValue("id")))
		case "race":
			e.Detail = l.course(r.PathValue("id"))
		case "race-member":
			e.Detail = strings.TrimSpace(l.course(r.PathValue("id")) + " — " + l.nomMembre(r.PathValue("memberId")))
		case "room":
			e.Detail = l.salon(r.PathValue("id"))
		case "message-room":
			e.Detail = l.salonDuMessage(r.PathValue("id"))
		}
		if !e.Success {
			e.Detail = strings.TrimSpace(e.Detail + " (" + strconv.Itoa(rec.status) + " " + http.StatusText(rec.status) + ")")
		}
		l.Record(e)
	})
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func (l *Logger) nomMembre(id string) string {
	var n string
	_ = l.db.QueryRow(`SELECT CONCAT(nom, ' ', prenom) FROM members WHERE id = ?`, id).Scan(&n)
	return n
}

func (l *Logger) nomRole(id string) string {
	var n string
	_ = l.db.QueryRow(`SELECT nom FROM app_roles WHERE id = ?`, id).Scan(&n)
	return n
}

func (l *Logger) course(id string) string {
	var t string
	var d sql.NullString
	_ = l.db.QueryRow(`SELECT titre, DATE_FORMAT(race_date, '%d/%m/%Y') FROM races WHERE id = ?`, id).Scan(&t, &d)
	if d.Valid && t != "" {
		return t + " (" + d.String + ")"
	}
	return t
}

func (l *Logger) salon(id string) string {
	var nom, kind string
	if l.db.QueryRow(`SELECT nom, kind FROM chat_rooms WHERE id = ?`, id).Scan(&nom, &kind) != nil {
		return ""
	}
	if kind == "dm" {
		return "message privé"
	}
	return nom
}

func (l *Logger) salonDuMessage(id string) string {
	var room int64
	if l.db.QueryRow(`SELECT room_id FROM chat_messages WHERE id = ?`, id).Scan(&room) != nil {
		return ""
	}
	return l.salon(strconv.FormatInt(room, 10))
}

// ---- Consultation ----

type Row struct {
	ID        int64     `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	Nom       string    `json:"nom"`
	Role      string    `json:"role"`
	Action    string    `json:"action"`
	Kind      string    `json:"type"`
	Detail    string    `json:"detail"`
	Success   bool      `json:"success"`
	Status    int       `json:"status"`
	IP        string    `json:"ip"`
}

type Filter struct {
	Before int64
	Q      string
	Role   string
	Kind   string // KindModification, KindNavigation, KindConnexion ou "" (tous)
	OK     string // "1", "0" ou ""
	From   string // AAAA-MM-JJ
	To     string
	Limit  int
}

type Page struct {
	Rows    []Row    `json:"rows"`
	More    bool     `json:"more"`
	Roles   []string `json:"roles"`
	Actions []string `json:"actions"`
	Total   int      `json:"total"`
}

func (l *Logger) List(f Filter) (*Page, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	where := []string{"1=1"}
	var args []any
	if q := strings.TrimSpace(f.Q); q != "" {
		like := "%" + strings.NewReplacer("%", `\%`, "_", `\_`).Replace(q) + "%"
		where = append(where, "(nom LIKE ? OR action LIKE ? OR detail LIKE ?)")
		args = append(args, like, like, like)
	}
	if f.Role != "" {
		where = append(where, "role = ?")
		args = append(args, f.Role)
	}
	switch f.Kind {
	case KindModification, KindNavigation, KindConnexion:
		where = append(where, "kind = ?")
		args = append(args, f.Kind)
	}
	switch f.OK {
	case "1":
		where = append(where, "success = TRUE")
	case "0":
		where = append(where, "success = FALSE")
	}
	if t, err := time.Parse("2006-01-02", f.From); err == nil {
		where = append(where, "created_at >= ?")
		args = append(args, t)
	}
	if t, err := time.Parse("2006-01-02", f.To); err == nil {
		where = append(where, "created_at < ?")
		args = append(args, t.AddDate(0, 0, 1))
	}
	w := strings.Join(where, " AND ") // filtres communs : le total ne tient pas compte de la pagination

	pageWhere, pageArgs := w, append([]any{}, args...)
	if f.Before > 0 {
		pageWhere += " AND id < ?"
		pageArgs = append(pageArgs, f.Before)
	}
	rows, err := l.db.Query(`SELECT id, created_at, nom, role, action, kind, detail, success, status, ip FROM audit_log WHERE `+pageWhere+` ORDER BY id DESC LIMIT ?`,
		append(pageArgs, f.Limit+1)...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	p := &Page{Rows: []Row{}}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.CreatedAt, &r.Nom, &r.Role, &r.Action, &r.Kind, &r.Detail, &r.Success, &r.Status, &r.IP); err != nil {
			return nil, err
		}
		p.Rows = append(p.Rows, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(p.Rows) > f.Limit {
		p.More = true
		p.Rows = p.Rows[:f.Limit]
	}
	_ = l.db.QueryRow(`SELECT COUNT(*) FROM audit_log WHERE `+w, args...).Scan(&p.Total)
	p.Roles = l.distinct("role")
	p.Actions = l.distinct("action")
	return p, nil
}

func (l *Logger) distinct(col string) []string {
	out := []string{}
	rows, err := l.db.Query(`SELECT DISTINCT ` + col + ` FROM audit_log WHERE ` + col + ` <> '' ORDER BY ` + col)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var s string
		if rows.Scan(&s) == nil {
			out = append(out, s)
		}
	}
	return out
}

// ---- HTTP ----

type Handler struct{ l *Logger }

func NewHandler(l *Logger) *Handler { return &Handler{l: l} }

// List : une page du journal, du plus récent au plus ancien, avec filtres (texte, rôle, résultat, période).
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	before, _ := strconv.ParseInt(q.Get("before"), 10, 64)
	limit, _ := strconv.Atoi(q.Get("limit"))
	page, err := h.l.List(Filter{Before: before, Q: q.Get("q"), Role: q.Get("role"), Kind: q.Get("type"), OK: q.Get("ok"), From: q.Get("from"), To: q.Get("to"), Limit: limit})
	if err != nil {
		http.Error(w, `{"error":"impossible de charger le journal"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = jsonEncode(w, page)
}

func jsonEncode(w http.ResponseWriter, v any) error { return json.NewEncoder(w).Encode(v) }

// Écrans de l'espace adhérent dont l'ouverture est journalisée (identifiant envoyé par l'application → libellé).
var ecrans = map[string]string{
	"overview": "Tableau de bord", "chat": "Messagerie", "trombi": "Trombinoscope", "courses": "Nos Courses",
	"resultats": "Résultats", "records": "Records du Club", "reseaute": "SAM Réseaute", "documents": "Plans & Documents",
	"vieduclub": "Vie du Club", "admin": "Admin Club", "droitsBureau": "Rôles et droits", "stats": "Statistiques",
	"journal": "Journal d'activité", "profil": "Mes informations", "aide": "Aide", "strava": "Mon activité (Strava)", "calculateur": "Calculateur d'allure",
}

// Navigation : l'application signale l'ouverture d'un écran (adhérent connecté, identifiant d'écran connu seulement).
func (h *Handler) Navigation(w http.ResponseWriter, r *http.Request, memberID int64) {
	var req struct {
		Ecran string `json:"ecran"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&req); err != nil {
		http.Error(w, `{"error":"requête invalide"}`, http.StatusBadRequest)
		return
	}
	nom, ok := ecrans[req.Ecran]
	if !ok {
		http.Error(w, `{"error":"écran inconnu"}`, http.StatusBadRequest)
		return
	}
	h.l.Record(Entry{MemberID: memberID, Action: "Ouverture de l'écran « " + nom + " »", Kind: KindNavigation, Success: true, Status: http.StatusNoContent, IP: ClientIP(r)})
	w.WriteHeader(http.StatusNoContent)
}
