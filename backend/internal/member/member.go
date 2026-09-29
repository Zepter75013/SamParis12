package member

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/mailer"
)

// formatNom applique la convention administrative : NOM DE FAMILLE toujours
// en majuscules.
func formatNom(s string) string {
	return strings.ToUpper(strings.TrimSpace(s))
}

// formatPrenom applique la convention administrative : prénom en
// minuscules, seule la première lettre en majuscule.
func formatPrenom(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return s
	}
	r := []rune(s)
	r[0] = unicode.ToUpper(r[0])
	return string(r)
}

// Member reprend la fiche adhérent : identité publique (trombinoscope),
// informations confidentielles (éditables par l'adhérent) et informations
// administratives (lecture seule pour l'adhérent, gérées par le bureau).
type Member struct {
	ID       int64  `json:"id"`
	Email    string `json:"email"`
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"`
	Role     string `json:"role"`
	Groupe   string `json:"groupe"`
	Statut   string `json:"statut"`
	PhotoURL string `json:"photoUrl"`
	IsBureau bool   `json:"isBureau"`

	// Informations visibles des autres adhérents (trombinoscope) — distinctes
	// des informations confidentielles ci-dessous, choisies et éditées par
	// l'adhérent lui-même pour se présenter au reste du club.
	TrombiHabite           string `json:"trombiHabite"`
	TrombiNaissance        string `json:"trombiNaissance"`
	TrombiOrigine          string `json:"trombiOrigine"`
	TrombiEmail            string `json:"trombiEmail"`
	TrombiTelephone        string `json:"trombiTelephone"`
	TrombiProfession       string `json:"trombiProfession"`
	TrombiEmployeur        string `json:"trombiEmployeur"`
	TrombiDistanceFavorite string `json:"trombiDistanceFavorite"`
	TrombiBio              string `json:"trombiBio"`

	DateNaissance     *string  `json:"dateNaissance"`
	LieuNaissance     string   `json:"lieuNaissance"`
	Adresse           string   `json:"adresse"`
	CodePostal        string   `json:"codePostal"`
	Ville             string   `json:"ville"`
	TelephoneDomicile string   `json:"telephoneDomicile"`
	TelephonePortable string   `json:"telephonePortable"`
	Nationalite       string   `json:"nationalite"`
	UrgenceNom        string   `json:"urgenceNom"`
	UrgenceTelephone  string   `json:"urgenceTelephone"`
	TailleMaillot     string   `json:"tailleMaillot"`
	VMA               *float64 `json:"vma"`
	VMADate           *string  `json:"vmaDate"`

	NumeroLicence         string   `json:"numeroLicence"`
	LicenciePar           string   `json:"licenciePar"`
	FonctionBureau        string   `json:"fonctionBureau"`
	DroitAdminEvenements  bool     `json:"droitAdminEvenements"`
	OrigineContact        string   `json:"origineContact"`
	AnneePremiereAdhesion *int     `json:"anneePremiereAdhesion"`
	DatePremiereAdhesion  *string  `json:"datePremiereAdhesion"`
	DateDernierCertificat *string  `json:"dateDernierCertificat"`
	AnneeDerniereAdhesion *int     `json:"anneeDerniereAdhesion"`
	ActiviteSaison        string   `json:"activiteSaison"`
	LicenceFFAType        string   `json:"licenceFfaType"`
	MontantCotisation     *float64 `json:"montantCotisation"`
	DatePaiementCotisation *string `json:"datePaiementCotisation"`
	ModePaiement          string  `json:"modePaiement"`
}

// PublicMember est la vue trombinoscope : les informations que l'adhérent a
// choisi de partager avec les autres membres — jamais les informations
// confidentielles ni administratives.
type PublicMember struct {
	ID                     int64  `json:"id"`
	Prenom                 string `json:"prenom"`
	Nom                    string `json:"nom"`
	Role                   string `json:"role"`
	Groupe                 string `json:"groupe"`
	Statut                 string `json:"statut"`
	PhotoURL               string `json:"photoUrl"`
	TrombiHabite           string `json:"trombiHabite"`
	TrombiNaissance        string `json:"trombiNaissance"`
	TrombiOrigine          string `json:"trombiOrigine"`
	TrombiEmail            string `json:"trombiEmail"`
	TrombiTelephone        string `json:"trombiTelephone"`
	TrombiProfession       string `json:"trombiProfession"`
	TrombiEmployeur        string `json:"trombiEmployeur"`
	TrombiDistanceFavorite string `json:"trombiDistanceFavorite"`
	TrombiBio              string `json:"trombiBio"`
}

// TrombiUpdate est le sous-ensemble de champs "visibles des autres
// adhérents" que l'adhérent peut modifier lui-même.
type TrombiUpdate struct {
	TrombiHabite           string `json:"trombiHabite"`
	TrombiNaissance        string `json:"trombiNaissance"`
	TrombiOrigine          string `json:"trombiOrigine"`
	TrombiEmail            string `json:"trombiEmail"`
	TrombiTelephone        string `json:"trombiTelephone"`
	TrombiProfession       string `json:"trombiProfession"`
	TrombiEmployeur        string `json:"trombiEmployeur"`
	TrombiDistanceFavorite string `json:"trombiDistanceFavorite"`
	TrombiBio              string `json:"trombiBio"`
}

// ConfidentialUpdate est le sous-ensemble de champs que l'adhérent peut modifier lui-même.
type ConfidentialUpdate struct {
	DateNaissance     *string  `json:"dateNaissance"`
	LieuNaissance     string   `json:"lieuNaissance"`
	Adresse           string   `json:"adresse"`
	CodePostal        string   `json:"codePostal"`
	Ville             string   `json:"ville"`
	TelephoneDomicile string   `json:"telephoneDomicile"`
	TelephonePortable string   `json:"telephonePortable"`
	Nationalite       string   `json:"nationalite"`
	UrgenceNom        string   `json:"urgenceNom"`
	UrgenceTelephone  string   `json:"urgenceTelephone"`
	TailleMaillot     string   `json:"tailleMaillot"`
	VMA               *float64 `json:"vma"`
	VMADate           *string  `json:"vmaDate"`
}

// AdminMemberUpdate est l'ensemble complet des champs qu'un membre du bureau
// peut modifier sur la fiche d'un autre adhérent (identité, confidentielles
// et administratives) — jamais l'email ni le mot de passe, qui restent gérés
// par l'adhérent lui-même via leurs propres circuits.
type AdminMemberUpdate struct {
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"`
	Role     string `json:"role"`
	Groupe   string `json:"groupe"`
	Statut   string `json:"statut"`
	IsBureau bool   `json:"isBureau"`

	DateNaissance     *string  `json:"dateNaissance"`
	LieuNaissance     string   `json:"lieuNaissance"`
	Adresse           string   `json:"adresse"`
	CodePostal        string   `json:"codePostal"`
	Ville             string   `json:"ville"`
	TelephoneDomicile string   `json:"telephoneDomicile"`
	TelephonePortable string   `json:"telephonePortable"`
	Nationalite       string   `json:"nationalite"`
	UrgenceNom        string   `json:"urgenceNom"`
	UrgenceTelephone  string   `json:"urgenceTelephone"`
	TailleMaillot     string   `json:"tailleMaillot"`
	VMA               *float64 `json:"vma"`
	VMADate           *string  `json:"vmaDate"`

	NumeroLicence          string   `json:"numeroLicence"`
	LicenciePar            string   `json:"licenciePar"`
	FonctionBureau         string   `json:"fonctionBureau"`
	DroitAdminEvenements   bool     `json:"droitAdminEvenements"`
	OrigineContact         string   `json:"origineContact"`
	AnneePremiereAdhesion  *int     `json:"anneePremiereAdhesion"`
	DatePremiereAdhesion   *string  `json:"datePremiereAdhesion"`
	DateDernierCertificat  *string  `json:"dateDernierCertificat"`
	AnneeDerniereAdhesion  *int     `json:"anneeDerniereAdhesion"`
	ActiviteSaison         string   `json:"activiteSaison"`
	LicenceFFAType         string   `json:"licenceFfaType"`
	MontantCotisation      *float64 `json:"montantCotisation"`
	DatePaiementCotisation *string  `json:"datePaiementCotisation"`
	ModePaiement           string   `json:"modePaiement"`
}

// AdminMemberCreate est le sous-ensemble de champs qu'un membre du bureau
// renseigne à la création d'un nouvel adhérent — uniquement l'identité de
// base. Un mot de passe aléatoire et inutilisable est généré côté serveur ;
// le nouvel adhérent définit son propre mot de passe via "Mot de passe
// oublié ?" (code envoyé par email), jamais choisi ou saisi par le bureau.
type AdminMemberCreate struct {
	Email    string `json:"email"`
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"`
	Role     string `json:"role"`
	Groupe   string `json:"groupe"`
	Statut   string `json:"statut"`
	IsBureau bool   `json:"isBureau"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Les colonnes DATE sont formatées en chaîne ('YYYY-MM-DD') directement en
// SQL : ça évite tout problème de scan NULL-able vers *string/*time.Time côté
// Go (le pilote MySQL, avec parseTime=true, renverrait sinon un time.Time non
// scannable dans un **string).
const memberColumns = `
	id, email, prenom, nom, role, groupe, statut, photo_path, is_bureau,
	trombi_habite, trombi_naissance, trombi_origine, trombi_email, trombi_telephone,
	trombi_profession, trombi_employeur, trombi_distance_favorite, trombi_bio,
	DATE_FORMAT(date_naissance, '%Y-%m-%d'), lieu_naissance, adresse, code_postal, ville,
	telephone_domicile, telephone_portable, nationalite, urgence_nom, urgence_telephone,
	taille_maillot, vma, DATE_FORMAT(vma_date, '%Y-%m-%d'),
	numero_licence, licencie_par, fonction_bureau, droit_admin_evenements, origine_contact,
	annee_premiere_adhesion, DATE_FORMAT(date_premiere_adhesion, '%Y-%m-%d'),
	DATE_FORMAT(date_dernier_certificat, '%Y-%m-%d'), annee_derniere_adhesion,
	activite_saison, licence_ffa_type, montant_cotisation, DATE_FORMAT(date_paiement_cotisation, '%Y-%m-%d'), mode_paiement
`

func scanMember(row *sql.Row) (*Member, error) {
	return scanMemberFunc(row.Scan)
}

func scanMemberRow(rows *sql.Rows) (*Member, error) {
	return scanMemberFunc(rows.Scan)
}

func scanMemberFunc(scan func(...any) error) (*Member, error) {
	var m Member
	var (
		dateNaissance, vmaDate, datePremiereAdhesion, dateDernierCertificat, datePaiementCotisation sql.NullString
		vma, montantCotisation                                                                       sql.NullFloat64
		anneePremiereAdhesion, anneeDerniereAdhesion                                                  sql.NullInt64
	)
	err := scan(
		&m.ID, &m.Email, &m.Prenom, &m.Nom, &m.Role, &m.Groupe, &m.Statut, &m.PhotoURL, &m.IsBureau,
		&m.TrombiHabite, &m.TrombiNaissance, &m.TrombiOrigine, &m.TrombiEmail, &m.TrombiTelephone,
		&m.TrombiProfession, &m.TrombiEmployeur, &m.TrombiDistanceFavorite, &m.TrombiBio,
		&dateNaissance, &m.LieuNaissance, &m.Adresse, &m.CodePostal, &m.Ville,
		&m.TelephoneDomicile, &m.TelephonePortable, &m.Nationalite, &m.UrgenceNom, &m.UrgenceTelephone,
		&m.TailleMaillot, &vma, &vmaDate,
		&m.NumeroLicence, &m.LicenciePar, &m.FonctionBureau, &m.DroitAdminEvenements, &m.OrigineContact,
		&anneePremiereAdhesion, &datePremiereAdhesion, &dateDernierCertificat, &anneeDerniereAdhesion,
		&m.ActiviteSaison, &m.LicenceFFAType, &montantCotisation, &datePaiementCotisation, &m.ModePaiement,
	)
	if err != nil {
		return nil, err
	}

	m.DateNaissance = nullStringPtr(dateNaissance)
	m.VMADate = nullStringPtr(vmaDate)
	m.DatePremiereAdhesion = nullStringPtr(datePremiereAdhesion)
	m.DateDernierCertificat = nullStringPtr(dateDernierCertificat)
	m.DatePaiementCotisation = nullStringPtr(datePaiementCotisation)
	m.VMA = nullFloatPtr(vma)
	m.MontantCotisation = nullFloatPtr(montantCotisation)
	m.AnneePremiereAdhesion = nullIntPtr(anneePremiereAdhesion)
	m.AnneeDerniereAdhesion = nullIntPtr(anneeDerniereAdhesion)

	return &m, nil
}

func nullStringPtr(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	return &v.String
}

func nullFloatPtr(v sql.NullFloat64) *float64 {
	if !v.Valid {
		return nil
	}
	return &v.Float64
}

func nullIntPtr(v sql.NullInt64) *int {
	if !v.Valid {
		return nil
	}
	n := int(v.Int64)
	return &n
}

func (r *Repository) GetByID(id int64) (*Member, error) {
	row := r.db.QueryRow(`SELECT `+memberColumns+` FROM members WHERE id = ?`, id)
	return scanMember(row)
}

func (r *Repository) GetByEmail(email string) (*Member, error) {
	row := r.db.QueryRow(`SELECT `+memberColumns+` FROM members WHERE email = ?`, email)
	return scanMember(row)
}

func (r *Repository) getAuth(email string) (id int64, passwordHash string, mustChange bool, err error) {
	err = r.db.QueryRow(`SELECT id, password_hash, must_change_password FROM members WHERE email = ?`, email).
		Scan(&id, &passwordHash, &mustChange)
	return
}

const publicMemberColumns = `
	id, prenom, nom, role, groupe, statut, photo_path,
	trombi_habite, trombi_naissance, trombi_origine, trombi_email, trombi_telephone,
	trombi_profession, trombi_employeur, trombi_distance_favorite, trombi_bio
`

func scanPublicMember(scan func(...any) error) (*PublicMember, error) {
	var m PublicMember
	err := scan(
		&m.ID, &m.Prenom, &m.Nom, &m.Role, &m.Groupe, &m.Statut, &m.PhotoURL,
		&m.TrombiHabite, &m.TrombiNaissance, &m.TrombiOrigine, &m.TrombiEmail, &m.TrombiTelephone,
		&m.TrombiProfession, &m.TrombiEmployeur, &m.TrombiDistanceFavorite, &m.TrombiBio,
	)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) ListPublic() ([]PublicMember, error) {
	rows, err := r.db.Query(`SELECT ` + publicMemberColumns + ` FROM members ORDER BY nom, prenom`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []PublicMember{}
	for rows.Next() {
		m, err := scanPublicMember(rows.Scan)
		if err != nil {
			return nil, err
		}
		members = append(members, *m)
	}
	return members, rows.Err()
}

func (r *Repository) GetPublicByID(id int64) (*PublicMember, error) {
	row := r.db.QueryRow(`SELECT `+publicMemberColumns+` FROM members WHERE id = ?`, id)
	return scanPublicMember(row.Scan)
}

func (r *Repository) UpdatePhotoPath(id int64, photoPath string) error {
	_, err := r.db.Exec(`UPDATE members SET photo_path = ? WHERE id = ?`, photoPath, id)
	return err
}

func (r *Repository) UpdateTrombi(id int64, t TrombiUpdate) error {
	_, err := r.db.Exec(`
		UPDATE members SET
			trombi_habite = ?, trombi_naissance = ?, trombi_origine = ?, trombi_email = ?,
			trombi_telephone = ?, trombi_profession = ?, trombi_employeur = ?,
			trombi_distance_favorite = ?, trombi_bio = ?
		WHERE id = ?`,
		t.TrombiHabite, t.TrombiNaissance, t.TrombiOrigine, t.TrombiEmail,
		t.TrombiTelephone, t.TrombiProfession, t.TrombiEmployeur,
		t.TrombiDistanceFavorite, t.TrombiBio,
		id,
	)
	return err
}

func (r *Repository) UpdateConfidential(id int64, u ConfidentialUpdate) error {
	_, err := r.db.Exec(`
		UPDATE members SET
			date_naissance = ?, lieu_naissance = ?, adresse = ?, code_postal = ?, ville = ?,
			telephone_domicile = ?, telephone_portable = ?, nationalite = ?,
			urgence_nom = ?, urgence_telephone = ?, taille_maillot = ?, vma = ?, vma_date = ?
		WHERE id = ?`,
		u.DateNaissance, u.LieuNaissance, u.Adresse, u.CodePostal, u.Ville,
		u.TelephoneDomicile, u.TelephonePortable, u.Nationalite,
		u.UrgenceNom, u.UrgenceTelephone, u.TailleMaillot, u.VMA, u.VMADate,
		id,
	)
	return err
}

// ListFull retourne la fiche complète de tous les adhérents — réservé au bureau.
func (r *Repository) ListFull() ([]Member, error) {
	rows, err := r.db.Query(`SELECT ` + memberColumns + ` FROM members ORDER BY nom, prenom`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []Member{}
	for rows.Next() {
		m, err := scanMemberRow(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, *m)
	}
	return members, rows.Err()
}

// Create insère un nouvel adhérent avec les seules informations d'identité ;
// les champs confidentiels/administratifs restent à leurs valeurs par
// défaut et pourront être complétés ensuite via UpdateAdmin. trombi_bio est
// une colonne TEXT NOT NULL sans DEFAULT : elle doit être fournie explicitement.
func (r *Repository) Create(m AdminMemberCreate, passwordHash string) (int64, error) {
	res, err := r.db.Exec(`
		INSERT INTO members (email, password_hash, must_change_password, prenom, nom, role, groupe, statut, is_bureau, trombi_bio)
		VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, ?, '')`,
		m.Email, passwordHash, m.Prenom, m.Nom, m.Role, m.Groupe, m.Statut, m.IsBureau,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) Delete(id int64) error {
	_, err := r.db.Exec(`DELETE FROM members WHERE id = ?`, id)
	return err
}

func (r *Repository) UpdateAdmin(id int64, u AdminMemberUpdate) error {
	_, err := r.db.Exec(`
		UPDATE members SET
			prenom = ?, nom = ?, role = ?, groupe = ?, statut = ?, is_bureau = ?,
			date_naissance = ?, lieu_naissance = ?, adresse = ?, code_postal = ?, ville = ?,
			telephone_domicile = ?, telephone_portable = ?, nationalite = ?,
			urgence_nom = ?, urgence_telephone = ?, taille_maillot = ?, vma = ?, vma_date = ?,
			numero_licence = ?, licencie_par = ?, fonction_bureau = ?, droit_admin_evenements = ?,
			origine_contact = ?, annee_premiere_adhesion = ?, date_premiere_adhesion = ?,
			date_dernier_certificat = ?, annee_derniere_adhesion = ?, activite_saison = ?,
			licence_ffa_type = ?, montant_cotisation = ?, date_paiement_cotisation = ?, mode_paiement = ?
		WHERE id = ?`,
		u.Prenom, u.Nom, u.Role, u.Groupe, u.Statut, u.IsBureau,
		u.DateNaissance, u.LieuNaissance, u.Adresse, u.CodePostal, u.Ville,
		u.TelephoneDomicile, u.TelephonePortable, u.Nationalite,
		u.UrgenceNom, u.UrgenceTelephone, u.TailleMaillot, u.VMA, u.VMADate,
		u.NumeroLicence, u.LicenciePar, u.FonctionBureau, u.DroitAdminEvenements,
		u.OrigineContact, u.AnneePremiereAdhesion, u.DatePremiereAdhesion,
		u.DateDernierCertificat, u.AnneeDerniereAdhesion, u.ActiviteSaison,
		u.LicenceFFAType, u.MontantCotisation, u.DatePaiementCotisation, u.ModePaiement,
		id,
	)
	return err
}

func (r *Repository) UpdateEmail(id int64, email string) error {
	_, err := r.db.Exec(`UPDATE members SET email = ? WHERE id = ?`, email, id)
	return err
}

func (r *Repository) SetPassword(id int64, passwordHash string) error {
	_, err := r.db.Exec(`UPDATE members SET password_hash = ?, must_change_password = FALSE WHERE id = ?`, passwordHash, id)
	return err
}

func (r *Repository) InvalidateResetCodes(memberID int64) error {
	_, err := r.db.Exec(`UPDATE password_reset_codes SET used = TRUE WHERE member_id = ? AND used = FALSE`, memberID)
	return err
}

func (r *Repository) CreateResetCode(memberID int64, codeHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(`INSERT INTO password_reset_codes (member_id, code_hash, expires_at) VALUES (?, ?, ?)`,
		memberID, codeHash, expiresAt)
	return err
}

// activeResetCode retourne le code actif le plus récent pour l'adhérent (non utilisé, non expiré).
func (r *Repository) activeResetCode(memberID int64) (id int64, codeHash string, err error) {
	err = r.db.QueryRow(`
		SELECT id, code_hash FROM password_reset_codes
		WHERE member_id = ? AND used = FALSE AND expires_at > NOW()
		ORDER BY created_at DESC LIMIT 1`, memberID).
		Scan(&id, &codeHash)
	return
}

func (r *Repository) consumeResetCode(id int64) error {
	_, err := r.db.Exec(`UPDATE password_reset_codes SET used = TRUE WHERE id = ?`, id)
	return err
}

// ---------------------------------------------------------------------------

type Handler struct {
	repo   *Repository
	mailer *mailer.Mailer
	auth   *AuthService
}

func NewHandler(repo *Repository, m *mailer.Mailer, auth *AuthService) *Handler {
	return &Handler{repo: repo, mailer: m, auth: auth}
}

func decodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))

	id, passwordHash, mustChange, err := h.repo.getAuth(email)
	if err == sql.ErrNoRows {
		httpx.Error(w, http.StatusUnauthorized, "email ou mot de passe incorrect")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
		httpx.Error(w, http.StatusUnauthorized, "email ou mot de passe incorrect")
		return
	}

	if mustChange {
		httpx.JSON(w, http.StatusForbidden, map[string]any{
			"error":            "vous devez définir votre mot de passe avant de continuer",
			"mustChangePassword": true,
		})
		return
	}

	m, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	token, err := h.auth.IssueToken(m.ID, m.IsBureau)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"token": token, "member": m})
}

type requestCodeRequest struct {
	Email string `json:"email"`
}

func (h *Handler) RequestCode(w http.ResponseWriter, r *http.Request) {
	var req requestCodeRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))

	m, err := h.repo.GetByEmail(email)
	if err == nil {
		code := generateCode()
		codeHash, hashErr := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if hashErr == nil {
			_ = h.repo.InvalidateResetCodes(m.ID)
			if err := h.repo.CreateResetCode(m.ID, string(codeHash), time.Now().Add(15*time.Minute)); err == nil {
				_ = h.mailer.SendCode(m.Email, code)
			}
		}
	}
	// Toujours 204, que l'email existe ou non, pour ne pas révéler les comptes existants.
	httpx.JSON(w, http.StatusNoContent, nil)
}

type confirmCodeRequest struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"newPassword"`
}

func (h *Handler) ConfirmCode(w http.ResponseWriter, r *http.Request) {
	var req confirmCodeRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if len(req.NewPassword) < 8 {
		httpx.Error(w, http.StatusBadRequest, "le mot de passe doit contenir au moins 8 caractères")
		return
	}

	m, err := h.repo.GetByEmail(email)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "code invalide ou expiré")
		return
	}

	codeID, codeHash, err := h.repo.activeResetCode(m.ID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "code invalide ou expiré")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(codeHash), []byte(strings.TrimSpace(req.Code))) != nil {
		httpx.Error(w, http.StatusBadRequest, "code invalide ou expiré")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if err := h.repo.SetPassword(m.ID, string(newHash)); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	_ = h.repo.consumeResetCode(codeID)

	token, err := h.auth.IssueToken(m.ID, m.IsBureau)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"token": token})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	memberID, ok := MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	m, err := h.repo.GetByID(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	memberID, ok := MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	var u ConfidentialUpdate
	if err := decodeJSON(r, &u); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if err := h.repo.UpdateConfidential(memberID, u); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer vos informations")
		return
	}
	m, err := h.repo.GetByID(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

func (h *Handler) UpdateTrombi(w http.ResponseWriter, r *http.Request) {
	memberID, ok := MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	var t TrombiUpdate
	if err := decodeJSON(r, &t); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if err := h.repo.UpdateTrombi(memberID, t); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer vos informations")
		return
	}
	m, err := h.repo.GetByID(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

type updateEmailRequest struct {
	NewEmail string `json:"newEmail"`
}

func (h *Handler) UpdateEmail(w http.ResponseWriter, r *http.Request) {
	memberID, ok := MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	var req updateEmailRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	newEmail := strings.ToLower(strings.TrimSpace(req.NewEmail))
	if !strings.Contains(newEmail, "@") {
		httpx.Error(w, http.StatusBadRequest, "adresse email invalide")
		return
	}
	if _, err := h.repo.GetByEmail(newEmail); err == nil {
		httpx.Error(w, http.StatusConflict, "cette adresse email est déjà utilisée")
		return
	}
	if err := h.repo.UpdateEmail(memberID, newEmail); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de mettre à jour l'adresse email")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

// AdminUpdateEmail permet à un membre du bureau de modifier l'adresse email
// d'un autre adhérent (par ex. en cas d'erreur de saisie ou de changement
// d'adresse que l'adhérent ne peut pas faire lui-même).
func (h *Handler) AdminUpdateEmail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	var req updateEmailRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	newEmail := strings.ToLower(strings.TrimSpace(req.NewEmail))
	if !strings.Contains(newEmail, "@") {
		httpx.Error(w, http.StatusBadRequest, "adresse email invalide")
		return
	}
	if existing, err := h.repo.GetByEmail(newEmail); err == nil && existing.ID != id {
		httpx.Error(w, http.StatusConflict, "cette adresse email est déjà utilisée")
		return
	}
	if err := h.repo.UpdateEmail(id, newEmail); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de mettre à jour l'adresse email")
		return
	}
	m, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

func (h *Handler) ListPublic(w http.ResponseWriter, r *http.Request) {
	members, err := h.repo.ListPublic()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger le trombinoscope")
		return
	}
	httpx.JSON(w, http.StatusOK, members)
}

const photoUploadDir = "uploads/photos"
const maxPhotoSize = 5 << 20 // 5 Mo

var allowedPhotoTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadPhoto reçoit la photo de trombinoscope de l'adhérent connecté
// (multipart/form-data, champ "photo") et remplace son ancienne photo.
func (h *Handler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	memberID, ok := MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxPhotoSize)
	if err := r.ParseMultipartForm(maxPhotoSize); err != nil {
		httpx.Error(w, http.StatusBadRequest, "fichier trop volumineux (5 Mo maximum)")
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "aucun fichier reçu")
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	ext, ok := allowedPhotoTypes[contentType]
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "format d'image non supporté (jpeg, png ou webp uniquement)")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	if err := os.MkdirAll(photoUploadDir, 0o755); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer la photo")
		return
	}

	filename := fmt.Sprintf("%d%s", memberID, ext)
	dstPath := filepath.Join(photoUploadDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer la photo")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer la photo")
		return
	}
	_ = header

	photoURL := "/uploads/photos/" + filename
	if err := h.repo.UpdatePhotoPath(memberID, photoURL); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer la photo")
		return
	}

	m, err := h.repo.GetByID(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

// ---------------------------------------------------------------------------
// Administration (réservé aux membres du bureau, via AuthService.RequireBureau)

func (h *Handler) AdminListMembers(w http.ResponseWriter, r *http.Request) {
	members, err := h.repo.ListFull()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les adhérents")
		return
	}
	httpx.JSON(w, http.StatusOK, members)
}

type createMemberRequest struct {
	Email    string `json:"email"`
	Prenom   string `json:"prenom"`
	Nom      string `json:"nom"`
	Role     string `json:"role"`
	Groupe   string `json:"groupe"`
	Statut   string `json:"statut"`
	IsBureau bool   `json:"isBureau"`
}

func (h *Handler) AdminCreateMember(w http.ResponseWriter, r *http.Request) {
	var req createMemberRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	prenom := formatPrenom(req.Prenom)
	nom := formatNom(req.Nom)
	if !strings.Contains(email, "@") || prenom == "" || nom == "" {
		httpx.Error(w, http.StatusBadRequest, "email, prénom et nom sont obligatoires")
		return
	}
	if _, err := h.repo.GetByEmail(email); err == nil {
		httpx.Error(w, http.StatusConflict, "un compte existe déjà avec cette adresse email")
		return
	}

	// Mot de passe aléatoire et inutilisable : le nouvel adhérent définit le
	// sien via "Mot de passe oublié ?" (code reçu par email), jamais choisi
	// par le bureau.
	randomPassword := make([]byte, 32)
	if _, err := rand.Read(randomPassword); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword(randomPassword, bcrypt.DefaultCost)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	id, err := h.repo.Create(AdminMemberCreate{
		Email: email, Prenom: prenom, Nom: nom,
		Role: req.Role, Groupe: req.Groupe, Statut: req.Statut, IsBureau: req.IsBureau,
	}, string(passwordHash))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de créer l'adhérent")
		return
	}

	m, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusCreated, m)
}

func (h *Handler) AdminDeleteMember(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	if callerID, ok := MemberIDFromContext(r.Context()); ok && callerID == id {
		httpx.Error(w, http.StatusBadRequest, "impossible de supprimer votre propre compte")
		return
	}
	if err := h.repo.Delete(id); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de supprimer l'adhérent")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

func (h *Handler) AdminGetMember(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	m, err := h.repo.GetByID(id)
	if err == sql.ErrNoRows {
		httpx.Error(w, http.StatusNotFound, "adhérent introuvable")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

func (h *Handler) AdminUpdateMember(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "identifiant invalide")
		return
	}
	var u AdminMemberUpdate
	if err := decodeJSON(r, &u); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	u.Prenom = formatPrenom(u.Prenom)
	u.Nom = formatNom(u.Nom)
	if err := h.repo.UpdateAdmin(id, u); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer les modifications")
		return
	}
	m, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}
