// Package strava : liaison d'un adhérent avec son compte Strava (OAuth) et lecture de ses propres activités.
//
// Règles de l'API Strava respectées : les données d'un athlète ne sont montrées qu'à cet athlète (aucune route ne renvoie
// l'activité d'un autre adhérent), elles ne sont pas conservées (seul un cache mémoire de quelques minutes limite les appels),
// et l'adhérent peut à tout moment révoquer l'accès. Les jetons sont chiffrés en base (AES-GCM).
package strava

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/member"
)

const (
	scopeDemande = "read,activity:read_all"
	cacheTTL     = 5 * time.Minute
	stateTTL     = 10 * time.Minute
)

type Config struct {
	ClientID     string
	ClientSecret string
	BaseURL      string // https://www.strava.com (modifiable pour les tests)
	FrontendURL  string // le retour d'autorisation se fait sur FrontendURL/espace-adherent/tableau-de-bord
	Secret       string // secret de l'application : sert à chiffrer les jetons et à signer l'état OAuth
}

type Handler struct {
	db   *sql.DB
	cfg  Config
	http *http.Client
	key  []byte // clé AES-256 des jetons
	sig  []byte // clé de signature de l'état OAuth

	mu    sync.Mutex
	cache map[string]cacheEntry
}

type cacheEntry struct {
	body []byte
	exp  time.Time
}

func NewHandler(db *sql.DB, cfg Config) *Handler {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://www.strava.com"
	}
	cfg.BaseURL = strings.TrimRight(cfg.BaseURL, "/")
	k := sha256.Sum256([]byte("strava-tokens:" + cfg.Secret))
	s := sha256.Sum256([]byte("strava-state:" + cfg.Secret))
	return &Handler{db: db, cfg: cfg, http: &http.Client{Timeout: 15 * time.Second}, key: k[:], sig: s[:], cache: map[string]cacheEntry{}}
}

func (h *Handler) configured() bool { return h.cfg.ClientID != "" && h.cfg.ClientSecret != "" }

func (h *Handler) redirectURI() string {
	return strings.TrimRight(h.cfg.FrontendURL, "/") + "/espace-adherent/tableau-de-bord" // adresse finale : /espace-adherent redirige et perdrait les paramètres
}

// ---- chiffrement des jetons ----

func (h *Handler) chiffrer(clair string) (string, error) {
	blk, err := aes.NewCipher(h.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(blk)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(gcm.Seal(nonce, nonce, []byte(clair), nil)), nil
}

func (h *Handler) dechiffrer(chiffre string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(chiffre)
	if err != nil {
		return "", err
	}
	blk, err := aes.NewCipher(h.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(blk)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("jeton illisible")
	}
	clair, err := gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], nil)
	return string(clair), err
}

// ---- état OAuth signé : « idAdhérent.expiration.aléa.signature » (protège contre les retours forgés) ----

func (h *Handler) etat(memberID int64) string {
	nonce := make([]byte, 8)
	_, _ = rand.Read(nonce)
	corps := fmt.Sprintf("%d.%d.%x", memberID, time.Now().Add(stateTTL).Unix(), nonce)
	m := hmac.New(sha256.New, h.sig)
	m.Write([]byte(corps))
	return corps + "." + base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func (h *Handler) verifierEtat(etat string, memberID int64) bool {
	i := strings.LastIndex(etat, ".")
	if i < 0 {
		return false
	}
	corps, sig := etat[:i], etat[i+1:]
	m := hmac.New(sha256.New, h.sig)
	m.Write([]byte(corps))
	attendu := base64.RawURLEncoding.EncodeToString(m.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(attendu)) {
		return false
	}
	parts := strings.Split(corps, ".")
	if len(parts) != 3 {
		return false
	}
	id, err1 := strconv.ParseInt(parts[0], 10, 64)
	exp, err2 := strconv.ParseInt(parts[1], 10, 64)
	return err1 == nil && err2 == nil && id == memberID && time.Now().Unix() < exp
}

// ---- liaison en base ----

type lien struct {
	AthleteID  int64
	AthleteNom string
	Acces      string
	Rafraichir string
	ExpireLe   time.Time
	Scope      string
	ConnecteLe time.Time
}

var errNonLie = errors.New("compte Strava non relié")

func (h *Handler) lire(memberID int64) (*lien, error) {
	var l lien
	var acces, rafr string
	err := h.db.QueryRow(`SELECT athlete_id, athlete_nom, access_token, refresh_token, expires_at, scope, connected_at FROM strava_links WHERE member_id = ?`, memberID).
		Scan(&l.AthleteID, &l.AthleteNom, &acces, &rafr, &l.ExpireLe, &l.Scope, &l.ConnecteLe)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errNonLie
	}
	if err != nil {
		return nil, err
	}
	if l.Acces, err = h.dechiffrer(acces); err != nil {
		return nil, err
	}
	if l.Rafraichir, err = h.dechiffrer(rafr); err != nil {
		return nil, err
	}
	return &l, nil
}

func (h *Handler) enregistrer(memberID int64, l *lien) error {
	acces, err := h.chiffrer(l.Acces)
	if err != nil {
		return err
	}
	rafr, err := h.chiffrer(l.Rafraichir)
	if err != nil {
		return err
	}
	_, err = h.db.Exec(`
		INSERT INTO strava_links (member_id, athlete_id, athlete_nom, access_token, refresh_token, expires_at, scope)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE athlete_id = VALUES(athlete_id), athlete_nom = VALUES(athlete_nom), access_token = VALUES(access_token),
			refresh_token = VALUES(refresh_token), expires_at = VALUES(expires_at), scope = VALUES(scope), connected_at = CURRENT_TIMESTAMP`,
		memberID, l.AthleteID, l.AthleteNom, acces, rafr, l.ExpireLe.UTC(), l.Scope)
	return err
}

func (h *Handler) supprimer(memberID int64) {
	_, _ = h.db.Exec(`DELETE FROM strava_links WHERE member_id = ?`, memberID)
	h.supprimerCache(memberID)
}

// ---- appels à Strava ----

type reponseToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
	Athlete      struct {
		ID        int64  `json:"id"`
		Firstname string `json:"firstname"`
		Lastname  string `json:"lastname"`
	} `json:"athlete"`
}

func (h *Handler) token(form url.Values) (*reponseToken, error) {
	form.Set("client_id", h.cfg.ClientID)
	form.Set("client_secret", h.cfg.ClientSecret)
	res, err := h.http.PostForm(h.cfg.BaseURL+"/oauth/token", form)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("strava a refusé l'échange (code %d)", res.StatusCode)
	}
	var t reponseToken
	if err := json.Unmarshal(body, &t); err != nil || t.AccessToken == "" {
		return nil, errors.New("réponse Strava illisible")
	}
	return &t, nil
}

var (
	errRevoque = errors.New("accès Strava retiré")
	errLimite  = errors.New("limite d'appels Strava atteinte")
)

// appeler lit une ressource de l'API Strava avec le jeton de l'adhérent (rafraîchi si besoin) ; résultat mis en cache quelques minutes.
func (h *Handler) appeler(memberID int64, chemin string) ([]byte, error) {
	cle := fmt.Sprintf("%d|%s", memberID, chemin)
	h.mu.Lock()
	if e, ok := h.cache[cle]; ok && time.Now().Before(e.exp) {
		h.mu.Unlock()
		return e.body, nil
	}
	h.mu.Unlock()

	l, err := h.lire(memberID)
	if err != nil {
		return nil, err
	}
	if time.Now().Add(time.Minute).After(l.ExpireLe) {
		t, err := h.token(url.Values{"grant_type": {"refresh_token"}, "refresh_token": {l.Rafraichir}})
		if err != nil {
			h.supprimer(memberID) // le jeton de renouvellement n'est plus accepté : l'adhérent a retiré l'accès chez Strava
			return nil, errRevoque
		}
		l.Acces, l.Rafraichir, l.ExpireLe = t.AccessToken, t.RefreshToken, time.Unix(t.ExpiresAt, 0)
		if err := h.enregistrer(memberID, l); err != nil {
			return nil, err
		}
	}
	req, _ := http.NewRequest(http.MethodGet, h.cfg.BaseURL+"/api/v3"+chemin, nil)
	req.Header.Set("Authorization", "Bearer "+l.Acces)
	res, err := h.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	switch {
	case res.StatusCode == http.StatusUnauthorized:
		h.supprimer(memberID)
		return nil, errRevoque
	case res.StatusCode == http.StatusTooManyRequests:
		return nil, errLimite
	case res.StatusCode != http.StatusOK:
		extrait := strings.Join(strings.Fields(string(body)), " ")
		if len(extrait) > 300 {
			extrait = extrait[:300] + "…"
		}
		return nil, fmt.Errorf("GET %s : Strava a répondu %d %s", chemin, res.StatusCode, extrait) // pas de jeton dans ce message
	}
	h.mu.Lock()
	h.cache[cle] = cacheEntry{body: body, exp: time.Now().Add(cacheTTL)}
	h.mu.Unlock()
	return body, nil
}

func (h *Handler) erreurStrava(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errNonLie):
		httpx.Error(w, http.StatusConflict, "Ton compte Strava n'est pas relié.")
	case errors.Is(err, errRevoque):
		httpx.Error(w, http.StatusConflict, "L'accès à ton compte Strava n'est plus valide : reconnecte-le.")
	case errors.Is(err, errLimite):
		httpx.Error(w, http.StatusTooManyRequests, "Strava limite le nombre de consultations : réessaie dans quelques minutes.")
	default:
		log.Printf("strava: %v", err)
		httpx.Error(w, http.StatusBadGateway, "Strava ne répond pas pour le moment : réessaie plus tard.")
	}
}

func idAdherent(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
	}
	return id, ok
}

// ---- routes ----

// Status : la liaison est-elle disponible, et l'adhérent est-il relié ?
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	id, ok := idAdherent(w, r)
	if !ok {
		return
	}
	out := map[string]any{"configured": h.configured(), "connected": false}
	if l, err := h.lire(id); err == nil {
		out["connected"] = true
		out["athleteId"] = l.AthleteID
		out["athleteNom"] = l.AthleteNom
		out["connectedAt"] = l.ConnecteLe
		out["activites"] = strings.Contains(l.Scope, "activity:read")
	}
	httpx.JSON(w, http.StatusOK, out)
}

// Connect : adresse d'autorisation Strava (l'adhérent y est envoyé pour accepter l'accès à ses activités).
func (h *Handler) Connect(w http.ResponseWriter, r *http.Request) {
	id, ok := idAdherent(w, r)
	if !ok {
		return
	}
	if !h.configured() {
		httpx.Error(w, http.StatusServiceUnavailable, "La liaison Strava n'est pas encore activée par le club.")
		return
	}
	q := url.Values{
		"client_id": {h.cfg.ClientID}, "redirect_uri": {h.redirectURI()}, "response_type": {"code"},
		"approval_prompt": {"auto"}, "scope": {scopeDemande}, "state": {h.etat(id)},
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"url": h.cfg.BaseURL + "/oauth/authorize?" + q.Encode()})
}

// Callback : retour de Strava (code + état) → échange contre des jetons et enregistrement.
func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	id, ok := idAdherent(w, r)
	if !ok {
		return
	}
	var req struct {
		Code  string `json:"code"`
		State string `json:"state"`
		Scope string `json:"scope"`
	}
	if err := httpx.DecodeJSON(r, &req); err != nil || req.Code == "" {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if !h.configured() {
		httpx.Error(w, http.StatusServiceUnavailable, "La liaison Strava n'est pas encore activée par le club.")
		return
	}
	if !h.verifierEtat(req.State, id) {
		httpx.Error(w, http.StatusBadRequest, "La demande de connexion a expiré : recommence depuis l'écran Mon activité.")
		return
	}
	if !strings.Contains(req.Scope, "activity:read") {
		httpx.Error(w, http.StatusBadRequest, "Pour afficher tes activités, laisse cochée l'autorisation « Voir les données de tes activités » sur la page de Strava.")
		return
	}
	t, err := h.token(url.Values{"grant_type": {"authorization_code"}, "code": {req.Code}})
	if err != nil {
		log.Printf("strava: échange du code : %v", err)
		httpx.Error(w, http.StatusBadGateway, "Strava a refusé la connexion : recommence depuis l'écran Mon activité.")
		return
	}
	nom := strings.TrimSpace(t.Athlete.Firstname + " " + t.Athlete.Lastname)
	l := &lien{AthleteID: t.Athlete.ID, AthleteNom: nom, Acces: t.AccessToken, Rafraichir: t.RefreshToken, ExpireLe: time.Unix(t.ExpiresAt, 0), Scope: req.Scope}
	if err := h.enregistrer(id, l); err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			httpx.Error(w, http.StatusConflict, "Ce compte Strava est déjà relié à un autre adhérent.")
			return
		}
		log.Printf("strava: enregistrement : %v", err)
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	h.supprimerCache(id)
	httpx.JSON(w, http.StatusOK, map[string]any{"connected": true, "athleteNom": nom})
}

func (h *Handler) supprimerCache(memberID int64) {
	h.mu.Lock()
	for k := range h.cache {
		if strings.HasPrefix(k, strconv.FormatInt(memberID, 10)+"|") {
			delete(h.cache, k)
		}
	}
	h.mu.Unlock()
}

// Disconnect : révoque l'accès chez Strava (au mieux) et oublie les jetons.
func (h *Handler) Disconnect(w http.ResponseWriter, r *http.Request) {
	id, ok := idAdherent(w, r)
	if !ok {
		return
	}
	if l, err := h.lire(id); err == nil {
		req, _ := http.NewRequest(http.MethodPost, h.cfg.BaseURL+"/oauth/deauthorize", strings.NewReader(url.Values{"access_token": {l.Acces}}.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		if res, err := h.http.Do(req); err == nil {
			res.Body.Close()
		}
	}
	h.supprimer(id)
	w.WriteHeader(http.StatusNoContent)
}

type Activite struct {
	ID          int64   `json:"id"`
	Nom         string  `json:"nom"`
	Sport       string  `json:"sport"`
	Debut       string  `json:"debut"` // date locale AAAA-MM-JJTHH:MM:SS
	DistanceM   float64 `json:"distanceM"`
	DureeS      int     `json:"dureeS"`
	TempsTotalS int     `json:"tempsTotalS"`
	DenivelePos float64 `json:"denivelePos"`
	VitesseMoy  float64 `json:"vitesseMoy"` // m/s
	FCMoyenne   float64 `json:"fcMoyenne"`
	Prive       bool    `json:"prive"`
}

type brutActivite struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	SportType  string  `json:"sport_type"`
	Type       string  `json:"type"`
	StartLocal string  `json:"start_date_local"`
	Distance   float64 `json:"distance"`
	Moving     int     `json:"moving_time"`
	Elapsed    int     `json:"elapsed_time"`
	Elevation  float64 `json:"total_elevation_gain"`
	AvgSpeed   float64 `json:"average_speed"`
	AvgHR      float64 `json:"average_heartrate"`
	Private    bool    `json:"private"`
}

func (a brutActivite) convertir() Activite {
	sport := a.SportType
	if sport == "" {
		sport = a.Type
	}
	return Activite{ID: a.ID, Nom: a.Name, Sport: sport, Debut: strings.TrimSuffix(a.StartLocal, "Z"), DistanceM: a.Distance, DureeS: a.Moving,
		TempsTotalS: a.Elapsed, DenivelePos: a.Elevation, VitesseMoy: a.AvgSpeed, FCMoyenne: a.AvgHR, Prive: a.Private}
}

const (
	parPagePeriode  = 200 // maximum accepté par Strava
	pagesMaxPeriode = 10  // 2 000 activités au plus par période (au-delà : « tronque »)
	joursMaxPeriode = 3700
)

// Activities : les activités de l'adhérent connecté (jamais celles d'un autre adhérent).
//   - sans paramètre : les plus récentes, 100 par page (?page=2 pour les plus anciennes) ;
//   - ?from=AAAA-MM-JJ&to=AAAA-MM-JJ : toutes les activités de la période (jours inclus), jusqu'à 2 000.
func (h *Handler) Activities(w http.ResponseWriter, r *http.Request) {
	id, ok := idAdherent(w, r)
	if !ok {
		return
	}
	q := r.URL.Query()
	if q.Get("from") != "" || q.Get("to") != "" {
		h.activitesPeriode(w, id, q.Get("from"), q.Get("to"))
		return
	}
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	body, err := h.appeler(id, fmt.Sprintf("/athlete/activities?per_page=100&page=%d", page))
	if err != nil {
		h.erreurStrava(w, err)
		return
	}
	var brut []brutActivite
	if err := json.Unmarshal(body, &brut); err != nil {
		h.erreurStrava(w, err)
		return
	}
	out := make([]Activite, 0, len(brut))
	for _, a := range brut {
		out = append(out, a.convertir())
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"activites": out, "page": page, "suite": len(brut) == 100})
}

// activitesPeriode lit toutes les activités entre deux jours (heure locale de l'activité). Strava filtre sur l'heure UTC :
// on demande un jour de marge de chaque côté, puis on garde exactement les jours demandés.
func (h *Handler) activitesPeriode(w http.ResponseWriter, memberID int64, from, to string) {
	debut, err1 := time.Parse("2006-01-02", from)
	fin, err2 := time.Parse("2006-01-02", to)
	if err1 != nil || err2 != nil || fin.Before(debut) || fin.Sub(debut) > joursMaxPeriode*24*time.Hour {
		httpx.Error(w, http.StatusBadRequest, "période invalide")
		return
	}
	apres := debut.Add(-24 * time.Hour).Unix()
	avant := fin.Add(48 * time.Hour).Unix()
	out := []Activite{}
	tronque := false
	for page := 1; ; page++ {
		if page > pagesMaxPeriode {
			tronque = true
			break
		}
		body, err := h.appeler(memberID, fmt.Sprintf("/athlete/activities?per_page=%d&page=%d&after=%d&before=%d", parPagePeriode, page, apres, avant))
		if err != nil {
			h.erreurStrava(w, err)
			return
		}
		var brut []brutActivite
		if err := json.Unmarshal(body, &brut); err != nil {
			h.erreurStrava(w, err)
			return
		}
		for _, a := range brut {
			jour := a.StartLocal
			if len(jour) >= 10 {
				jour = jour[:10]
			}
			if jour >= from && jour <= to {
				out = append(out, a.convertir())
			}
		}
		if len(brut) < parPagePeriode {
			break
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Debut > out[j].Debut })
	httpx.JSON(w, http.StatusOK, map[string]any{"activites": out, "from": from, "to": to, "tronque": tronque})
}

type Totaux struct {
	Nombre    int     `json:"nombre"`
	DistanceM float64 `json:"distanceM"`
	DureeS    int     `json:"dureeS"`
	Denivele  float64 `json:"denivele"`
}

// Stats : totaux Strava de l'adhérent (4 dernières semaines, année en cours, depuis toujours) pour la course, le vélo et la natation.
func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	id, ok := idAdherent(w, r)
	if !ok {
		return
	}
	l, err := h.lire(id)
	if err != nil {
		h.erreurStrava(w, err)
		return
	}
	body, err := h.appeler(id, fmt.Sprintf("/athletes/%d/stats", l.AthleteID))
	if err != nil {
		h.erreurStrava(w, err)
		return
	}
	type t struct {
		Count     int     `json:"count"`
		Distance  float64 `json:"distance"`
		Moving    int     `json:"moving_time"`
		Elevation float64 `json:"elevation_gain"`
	}
	var brut map[string]t
	if err := json.Unmarshal(body, &brut); err != nil {
		h.erreurStrava(w, err)
		return
	}
	conv := func(x t) Totaux { return Totaux{x.Count, x.Distance, x.Moving, x.Elevation} }
	sport := func(p string) map[string]Totaux {
		return map[string]Totaux{"recent": conv(brut["recent_"+p+"_totals"]), "annee": conv(brut["ytd_"+p+"_totals"]), "total": conv(brut["all_"+p+"_totals"])}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"course": sport("run"), "velo": sport("ride"), "natation": sport("swim")})
}
