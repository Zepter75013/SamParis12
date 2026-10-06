package member

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"

	"samparis12/backend/internal/audit"
	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/mailer"
	"samparis12/backend/internal/perm"
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

// cleanSexe ne garde que les valeurs prévues : 'F', 'H' ou ” (non renseigné).
func cleanSexe(s string) string {
	switch strings.ToUpper(strings.TrimSpace(s)) {
	case "F":
		return "F"
	case "H":
		return "H"
	}
	return ""
}

// RoleRef : rôle d'un adhérent dans l'application.
type RoleRef struct {
	ID  int64  `json:"id"`
	Nom string `json:"nom"`
}

// Member reprend la fiche adhérent : identité publique (trombinoscope),
// informations confidentielles (éditables par l'adhérent) et informations
// administratives (lecture seule pour l'adhérent, gérées par le bureau).
type Member struct {
	ID     int64  `json:"id"`
	Email  string `json:"email"`
	Prenom string `json:"prenom"`
	Nom    string `json:"nom"`
	Role   string `json:"role"`
	Groupe string `json:"groupe"`
	Statut string `json:"statut"`
	Sexe   string `json:"sexe"` // 'F', 'H' ou '' (non renseigné)
	// MenuLayout : disposition du menu de l'espace adhérent choisie par l'adhérent ('horizontal' ou 'lateral').
	MenuLayout string `json:"menuLayout"`
	PhotoURL   string `json:"photoUrl"`
	IsBureau   bool   `json:"isBureau"`
	// IsSuperAdmin est seul-e à pouvoir modifier les fonctionnalités (droits
	// des autres membres du bureau) — is_bureau seul ne suffit pas.
	IsSuperAdmin bool `json:"isSuperAdmin"`

	// Rôle dans l'application et fonctionnalités qui en découlent (voir package perm). Le rôle « Adhérent » n'en a aucune.
	RoleApp  *RoleRef `json:"roleApp"`
	Features []string `json:"features"`

	// Suivi de l'email de bienvenue envoyé par le bureau (nullable, date du
	// dernier envoi) et de l'activation du compte par l'adhérent lui-même
	// (nullable, première définition de mot de passe).
	WelcomeEmailSentAt *string `json:"welcomeEmailSentAt"`
	ActivatedAt        *string `json:"activatedAt"`

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

	NumeroLicence          string   `json:"numeroLicence"`
	LicenciePar            string   `json:"licenciePar"`
	FonctionBureau         string   `json:"fonctionBureau"`
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
	Sexe                   string `json:"sexe"`
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
	Prenom    string `json:"prenom"`
	Nom       string `json:"nom"`
	Role      string `json:"role"`
	Groupe    string `json:"groupe"`
	Statut    string `json:"statut"`
	Sexe      string `json:"sexe"`
	RoleAppID *int64 `json:"roleAppId"` // rôle dans l'application (modifiable seulement avec « Gérer les rôles et les droits »)

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
	Email     string `json:"email"`
	Prenom    string `json:"prenom"`
	Nom       string `json:"nom"`
	Role      string `json:"role"`
	Groupe    string `json:"groupe"`
	Statut    string `json:"statut"`
	Sexe      string `json:"sexe"`
	RoleAppID *int64 `json:"roleAppId"`
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
	id, email, prenom, nom, role, groupe, statut, sexe, menu_layout, photo_path, is_bureau, is_super_admin,
	DATE_FORMAT(welcome_email_sent_at, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(activated_at, '%Y-%m-%d %H:%i:%s'),
	trombi_habite, trombi_naissance, trombi_origine, trombi_email, trombi_telephone,
	trombi_profession, trombi_employeur, trombi_distance_favorite, trombi_bio,
	DATE_FORMAT(date_naissance, '%Y-%m-%d'), lieu_naissance, adresse, code_postal, ville,
	telephone_domicile, telephone_portable, nationalite, urgence_nom, urgence_telephone,
	taille_maillot, vma, DATE_FORMAT(vma_date, '%Y-%m-%d'),
	numero_licence, licencie_par, fonction_bureau, origine_contact,
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
		welcomeEmailSentAt, activatedAt                                                             sql.NullString
		vma, montantCotisation                                                                      sql.NullFloat64
		anneePremiereAdhesion, anneeDerniereAdhesion                                                sql.NullInt64
	)
	err := scan(
		&m.ID, &m.Email, &m.Prenom, &m.Nom, &m.Role, &m.Groupe, &m.Statut, &m.Sexe, &m.MenuLayout, &m.PhotoURL, &m.IsBureau, &m.IsSuperAdmin,
		&welcomeEmailSentAt, &activatedAt,
		&m.TrombiHabite, &m.TrombiNaissance, &m.TrombiOrigine, &m.TrombiEmail, &m.TrombiTelephone,
		&m.TrombiProfession, &m.TrombiEmployeur, &m.TrombiDistanceFavorite, &m.TrombiBio,
		&dateNaissance, &m.LieuNaissance, &m.Adresse, &m.CodePostal, &m.Ville,
		&m.TelephoneDomicile, &m.TelephonePortable, &m.Nationalite, &m.UrgenceNom, &m.UrgenceTelephone,
		&m.TailleMaillot, &vma, &vmaDate,
		&m.NumeroLicence, &m.LicenciePar, &m.FonctionBureau, &m.OrigineContact,
		&anneePremiereAdhesion, &datePremiereAdhesion, &dateDernierCertificat, &anneeDerniereAdhesion,
		&m.ActiviteSaison, &m.LicenceFFAType, &montantCotisation, &datePaiementCotisation, &m.ModePaiement,
	)
	if err != nil {
		return nil, err
	}

	m.WelcomeEmailSentAt = nullStringPtr(welcomeEmailSentAt)
	m.ActivatedAt = nullStringPtr(activatedAt)
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
	m, err := scanMember(row)
	if err != nil {
		return nil, err
	}
	return m, r.decorate([]*Member{m})
}

func (r *Repository) GetByEmail(email string) (*Member, error) {
	row := r.db.QueryRow(`SELECT `+memberColumns+` FROM members WHERE email = ?`, email)
	m, err := scanMember(row)
	if err != nil {
		return nil, err
	}
	return m, r.decorate([]*Member{m})
}

var prefixeLicence = regexp.MustCompile(`(?i)^(ffa)?[\s:.\-]*(n°|nº|no\.?\s|n\s)?[\s:.\-]*`)

// licenceKey normalise un numéro de licence saisi : sans « FFA », « N° », espaces ni ponctuation, en majuscules.
func licenceKey(s string) string {
	s = prefixeLicence.ReplaceAllString(strings.TrimSpace(s), "")
	var b strings.Builder
	for _, c := range strings.ToUpper(s) {
		if (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') {
			b.WriteRune(c)
		}
	}
	return b.String()
}

// resolveLogin transforme l'identifiant saisi à la connexion en adresse email du compte : une adresse email telle quelle,
// sinon un numéro de licence (« 1760320 », « FFA N° 1 760 320 »…). Un numéro inconnu ou partagé par plusieurs adhérents
// ne donne rien (connexion refusée), comme une adresse inconnue.
func (r *Repository) resolveLogin(ident string) string {
	ident = strings.ToLower(strings.TrimSpace(ident))
	if strings.Contains(ident, "@") {
		return ident
	}
	key := licenceKey(ident)
	if key == "" {
		return ""
	}
	rows, err := r.db.Query(`
		SELECT email FROM members
		WHERE numero_licence <> '' AND UPPER(REGEXP_REPLACE(numero_licence, '[^A-Za-z0-9]', '')) = ? LIMIT 2`, key)
	if err != nil {
		return ""
	}
	defer rows.Close()
	var emails []string
	for rows.Next() {
		var e string
		if rows.Scan(&e) == nil {
			emails = append(emails, e)
		}
	}
	if len(emails) != 1 {
		return ""
	}
	return strings.ToLower(emails[0])
}

func (r *Repository) getAuth(email string) (id int64, passwordHash string, mustChange bool, err error) {
	err = r.db.QueryRow(`SELECT id, password_hash, must_change_password FROM members WHERE email = ?`, email).
		Scan(&id, &passwordHash, &mustChange)
	return
}

const publicMemberColumns = `
	id, prenom, nom, role, groupe, statut, sexe, photo_path,
	trombi_habite, trombi_naissance, trombi_origine, trombi_email, trombi_telephone,
	trombi_profession, trombi_employeur, trombi_distance_favorite, trombi_bio
`

func scanPublicMember(scan func(...any) error) (*PublicMember, error) {
	var m PublicMember
	err := scan(
		&m.ID, &m.Prenom, &m.Nom, &m.Role, &m.Groupe, &m.Statut, &m.Sexe, &m.PhotoURL,
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
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	ptrs := make([]*Member, len(members))
	for i := range members {
		ptrs[i] = &members[i]
	}
	return members, r.decorate(ptrs)
}

// Create insère un nouvel adhérent avec les seules informations d'identité ;
// les champs confidentiels/administratifs restent à leurs valeurs par
// défaut et pourront être complétés ensuite via UpdateAdmin. trombi_bio est
// une colonne TEXT NOT NULL sans DEFAULT : elle doit être fournie explicitement.
func (r *Repository) Create(m AdminMemberCreate, passwordHash string) (int64, error) {
	res, err := r.db.Exec(`
		INSERT INTO members (email, password_hash, must_change_password, prenom, nom, role, groupe, statut, sexe, is_bureau, trombi_bio)
		VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, '')`,
		m.Email, passwordHash, m.Prenom, m.Nom, m.Role, m.Groupe, m.Statut, m.Sexe, false,
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
			prenom = ?, nom = ?, role = ?, groupe = ?, statut = ?, sexe = ?,
			date_naissance = ?, lieu_naissance = ?, adresse = ?, code_postal = ?, ville = ?,
			telephone_domicile = ?, telephone_portable = ?, nationalite = ?,
			urgence_nom = ?, urgence_telephone = ?, taille_maillot = ?, vma = ?, vma_date = ?,
			numero_licence = ?, licencie_par = ?, fonction_bureau = ?,
			origine_contact = ?, annee_premiere_adhesion = ?, date_premiere_adhesion = ?,
			date_dernier_certificat = ?, annee_derniere_adhesion = ?, activite_saison = ?,
			licence_ffa_type = ?, montant_cotisation = ?, date_paiement_cotisation = ?, mode_paiement = ?
		WHERE id = ?`,
		u.Prenom, u.Nom, u.Role, u.Groupe, u.Statut, u.Sexe,
		u.DateNaissance, u.LieuNaissance, u.Adresse, u.CodePostal, u.Ville,
		u.TelephoneDomicile, u.TelephonePortable, u.Nationalite,
		u.UrgenceNom, u.UrgenceTelephone, u.TailleMaillot, u.VMA, u.VMADate,
		u.NumeroLicence, u.LicenciePar, u.FonctionBureau,
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
	_, err := r.db.Exec(`
		UPDATE members SET
			password_hash = ?, must_change_password = FALSE,
			activated_at = COALESCE(activated_at, NOW())
		WHERE id = ?`, passwordHash, id)
	return err
}

// MarkWelcomeEmailSent enregistre la date d'envoi (ou de réenvoi) de l'email
// de bienvenue par le bureau à un adhérent.
func (r *Repository) MarkWelcomeEmailSent(id int64) error {
	_, err := r.db.Exec(`UPDATE members SET welcome_email_sent_at = NOW() WHERE id = ?`, id)
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

// SetAudit branche le journal d'activité (connexions, codes de réinitialisation).
func (h *Handler) SetAudit(l *audit.Logger) { h.audit = l }

// masque : un identifiant inconnu n'est jamais conservé en entier dans le journal (il peut contenir une faute de frappe de mot de passe).
func masque(s string) string {
	s = strings.TrimSpace(s)
	r := []rune(s)
	if len(r) <= 3 {
		return "***"
	}
	return string(r[:3]) + "…"
}

func (h *Handler) journalConnexion(r *http.Request, memberID int64, saisie, detail string, ok bool, status int) {
	e := audit.Entry{MemberID: memberID, Action: "Connexion", Detail: detail, Success: ok, Status: status, IP: audit.ClientIP(r)}
	if memberID == 0 {
		e.Nom = "(identifiant inconnu)"
		e.Detail = strings.TrimSpace("identifiant saisi : " + masque(saisie) + " " + detail)
	}
	h.audit.Record(e)
}

type Handler struct {
	repo        *Repository
	mailer      *mailer.Mailer
	auth        *AuthService
	frontendURL string
	audit       *audit.Logger
}

func NewHandler(repo *Repository, m *mailer.Mailer, auth *AuthService, frontendURL string) *Handler {
	return &Handler{repo: repo, mailer: m, auth: auth, frontendURL: frontendURL}
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
	// L'identifiant est une adresse email ou un numéro de licence.
	email := h.repo.resolveLogin(req.Email)

	id, passwordHash, mustChange, err := h.repo.getAuth(email)
	if err == sql.ErrNoRows {
		h.journalConnexion(r, 0, req.Email, "", false, http.StatusUnauthorized)
		httpx.Error(w, http.StatusUnauthorized, "identifiant ou mot de passe incorrect")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	par := "par email"
	if !strings.Contains(req.Email, "@") {
		par = "par n° de licence"
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
		h.journalConnexion(r, id, req.Email, par+" : mot de passe incorrect", false, http.StatusUnauthorized)
		httpx.Error(w, http.StatusUnauthorized, "identifiant ou mot de passe incorrect")
		return
	}

	if mustChange {
		h.journalConnexion(r, id, req.Email, par+" : première connexion, mot de passe à définir", false, http.StatusForbidden)
		httpx.JSON(w, http.StatusForbidden, map[string]any{
			"error":              "vous devez définir votre mot de passe avant de continuer",
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
	h.journalConnexion(r, m.ID, req.Email, par, true, http.StatusOK)
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
	email := h.repo.resolveLogin(req.Email) // adresse email ou numéro de licence

	m, err := h.repo.GetByEmail(email)
	if err == nil {
		code := generateCode()
		codeHash, hashErr := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if hashErr == nil {
			_ = h.repo.InvalidateResetCodes(m.ID)
			h.audit.Record(audit.Entry{MemberID: m.ID, Action: "Demande de code de réinitialisation du mot de passe", Success: true, Status: http.StatusNoContent, IP: audit.ClientIP(r)})
			if err := h.repo.CreateResetCode(m.ID, string(codeHash), time.Now().Add(15*time.Minute)); err == nil {
				if sendErr := h.mailer.SendCode(m.Email, code); sendErr != nil {
					log.Printf("mailer: échec envoi code à %s : %v", m.Email, sendErr)
				} else {
					log.Printf("mailer: code envoyé à %s (relais SMTP OK)", m.Email)
				}
			}
		}
	} else {
		log.Printf("mailer: demande de code pour %q — aucun compte trouvé avec cet identifiant", req.Email)
		h.audit.Record(audit.Entry{Nom: "(identifiant inconnu)", Action: "Demande de code de réinitialisation du mot de passe", Detail: "identifiant saisi : " + masque(req.Email), Success: false, Status: http.StatusNoContent, IP: audit.ClientIP(r)})
	}
	// Toujours 204, que l'email existe ou non, pour ne pas révéler les comptes existants.
	httpx.JSON(w, http.StatusNoContent, nil)
}

type verifyCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// VerifyCode vérifie qu'un code est valide (actif, non expiré, correspond au
// hash stocké) SANS le consommer ni rien modifier — utilisé par l'écran de
// connexion pour n'afficher les champs de nouveau mot de passe qu'après
// confirmation que le code saisi est correct. ConfirmCode revalide et
// consomme le code au moment de l'enregistrement effectif.
func (h *Handler) VerifyCode(w http.ResponseWriter, r *http.Request) {
	var req verifyCodeRequest
	if err := decodeJSON(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	email := h.repo.resolveLogin(req.Email)
	m, err := h.repo.GetByEmail(email)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "code invalide ou expiré")
		return
	}
	_, codeHash, err := h.repo.activeResetCode(m.ID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "code invalide ou expiré")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(codeHash), []byte(strings.TrimSpace(req.Code))) != nil {
		httpx.Error(w, http.StatusBadRequest, "code invalide ou expiré")
		return
	}
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
	email := h.repo.resolveLogin(req.Email)
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
	h.audit.Record(audit.Entry{MemberID: m.ID, Action: "Mot de passe défini grâce à un code", Success: true, Status: http.StatusOK, IP: audit.ClientIP(r)})

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

// UpdatePreferences : préférences d'affichage de l'adhérent connecté (disposition du menu).
func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	memberID, ok := MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	var req struct {
		MenuLayout string `json:"menuLayout"`
	}
	if err := decodeJSON(r, &req); err != nil || (req.MenuLayout != "horizontal" && req.MenuLayout != "lateral") {
		httpx.Error(w, http.StatusBadRequest, "disposition du menu invalide (horizontal ou lateral)")
		return
	}
	if _, err := h.repo.db.Exec(`UPDATE members SET menu_layout = ? WHERE id = ?`, req.MenuLayout, memberID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer la préférence")
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
	Email     string `json:"email"`
	Prenom    string `json:"prenom"`
	Nom       string `json:"nom"`
	Role      string `json:"role"`
	Groupe    string `json:"groupe"`
	Statut    string `json:"statut"`
	Sexe      string `json:"sexe"`
	RoleAppID *int64 `json:"roleAppId"`
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
		Role: req.Role, Groupe: req.Groupe, Statut: req.Statut, Sexe: cleanSexe(req.Sexe),
	}, string(passwordHash))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de créer l'adhérent")
		return
	}
	// Rôle : « Adhérent » par défaut ; un autre rôle n'est attribué que par qui peut gérer les rôles.
	roleID, err := h.repo.defaultRoleID()
	if err == nil && req.RoleAppID != nil {
		callerID, _ := MemberIDFromContext(r.Context())
		if h.repo.HasFeature(callerID, perm.RolesAdmin) {
			roleID = *req.RoleAppID
		}
	}
	if err != nil || h.repo.SetRole(id, roleID) != nil {
		httpx.Error(w, http.StatusBadRequest, "rôle inconnu : l'adhérent est créé sans rôle, à attribuer dans sa fiche")
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
	if err := h.repo.checkRemovable(id); err != nil {
		httpx.Error(w, http.StatusConflict, err.Error())
		return
	}
	if err := h.repo.Delete(id); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de supprimer l'adhérent")
		return
	}
	httpx.JSON(w, http.StatusNoContent, nil)
}

// AdminSendWelcomeEmail envoie (ou renvoie) à un adhérent l'email de
// bienvenue lui expliquant comment définir son mot de passe et accéder à
// l'espace adhérent.
func (h *Handler) AdminSendWelcomeEmail(w http.ResponseWriter, r *http.Request) {
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

	loginURL := strings.TrimRight(h.frontendURL, "/") + "/espace-adherent"
	if err := h.mailer.SendWelcome(m.Email, m.Prenom, loginURL); err != nil {
		log.Printf("mailer: échec envoi email de bienvenue à %s : %v", m.Email, err)
		httpx.Error(w, http.StatusInternalServerError, "impossible d'envoyer l'email de bienvenue")
		return
	}
	log.Printf("mailer: email de bienvenue envoyé à %s (relais SMTP OK)", m.Email)
	if err := h.repo.MarkWelcomeEmailSent(id); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	updated, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, updated)
}

// AdminGenerateCode crée un code de connexion pour un adhérent (même
// mécanisme que "Mot de passe oublié ?") et le renvoie en clair au bureau,
// qui peut alors le communiquer par un autre moyen (téléphone, SMS, en
// personne) si l'adhérent ne reçoit pas l'email — par ex. en cas de
// filtrage anti-spam chez son fournisseur. L'envoi par email reste tenté en
// parallèle (best-effort), mais son échec n'empêche pas de renvoyer le code.
func (h *Handler) AdminGenerateCode(w http.ResponseWriter, r *http.Request) {
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

	code := generateCode()
	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	_ = h.repo.InvalidateResetCodes(m.ID)
	expiresAt := time.Now().Add(15 * time.Minute)
	if err := h.repo.CreateResetCode(m.ID, string(codeHash), expiresAt); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de générer le code")
		return
	}
	if sendErr := h.mailer.SendCode(m.Email, code); sendErr != nil {
		log.Printf("mailer: échec envoi code (généré par le bureau) à %s : %v", m.Email, sendErr)
	} else {
		log.Printf("mailer: code (généré par le bureau) envoyé à %s (relais SMTP OK)", m.Email)
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"code":      code,
		"expiresAt": expiresAt.Format("2006-01-02 15:04:05"),
	})
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
	u.Sexe = cleanSexe(u.Sexe)

	current, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "adhérent introuvable")
		return
	}
	// Le rôle dans l'application ne se change qu'avec la fonctionnalité « Gérer les rôles et les droits » ;
	// on ne bloque que si le rôle change réellement, pour ne pas gêner l'édition normale d'une fiche.
	roleChange := u.RoleAppID != nil && (current.RoleApp == nil || *u.RoleAppID != current.RoleApp.ID)
	if roleChange {
		callerID, _ := MemberIDFromContext(r.Context())
		if !h.repo.HasFeature(callerID, perm.RolesAdmin) {
			httpx.Error(w, http.StatusForbidden, "seul un administrateur des rôles peut changer le rôle d'un adhérent")
			return
		}
		if err := h.repo.checkRoleChange(id, *u.RoleAppID); err != nil {
			httpx.Error(w, http.StatusConflict, err.Error())
			return
		}
	}

	if err := h.repo.UpdateAdmin(id, u); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer les modifications")
		return
	}
	if roleChange {
		if err := h.repo.SetRole(id, *u.RoleAppID); err != nil {
			httpx.Error(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	m, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusOK, m)
}

// ---------------------------------------------------------------------------
// Statistiques publiques (site vitrine) : agrégats uniquement, aucune donnée nominative.

type ActiviteCount struct {
	Activite string `json:"activite"`
	Nombre   int    `json:"nombre"`
}

type TrancheAgeCount struct {
	Tranche string `json:"tranche"`
	Nombre  int    `json:"nombre"`
}

type PublicStats struct {
	Adherents   int               `json:"adherents"`
	AgeMin      *int              `json:"ageMin"`
	AgeMax      *int              `json:"ageMax"`
	Activites   []ActiviteCount   `json:"activites"`
	TranchesAge []TrancheAgeCount `json:"tranchesAge"`
}

// PublicStats calcule les effectifs du club à partir des adhérents en base :
// total, âges extrêmes et répartition par activité et par tranche de 5 ans
// (uniquement pour les adhérents dont la date de naissance est renseignée).
func (h *Handler) PublicStats(w http.ResponseWriter, r *http.Request) {
	db := h.repo.db
	var st PublicStats
	st.Activites = []ActiviteCount{}
	st.TranchesAge = []TrancheAgeCount{}

	if err := db.QueryRow(`SELECT COUNT(*) FROM members`).Scan(&st.Adherents); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	var ageMin, ageMax sql.NullInt64
	if err := db.QueryRow(`
		SELECT MIN(TIMESTAMPDIFF(YEAR, date_naissance, CURDATE())), MAX(TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()))
		FROM members WHERE date_naissance IS NOT NULL`).Scan(&ageMin, &ageMax); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if ageMin.Valid {
		v := int(ageMin.Int64)
		st.AgeMin = &v
	}
	if ageMax.Valid {
		v := int(ageMax.Int64)
		st.AgeMax = &v
	}

	rows, err := db.Query(`
		SELECT activite_saison, COUNT(*) FROM members
		WHERE activite_saison <> '' GROUP BY activite_saison ORDER BY COUNT(*) DESC, activite_saison`)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	for rows.Next() {
		var a ActiviteCount
		if err := rows.Scan(&a.Activite, &a.Nombre); err != nil {
			rows.Close()
			httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
			return
		}
		st.Activites = append(st.Activites, a)
	}
	rows.Close()

	rows, err = db.Query(`
		SELECT FLOOR(TIMESTAMPDIFF(YEAR, date_naissance, CURDATE()) / 5) * 5 AS b, COUNT(*)
		FROM members WHERE date_naissance IS NOT NULL GROUP BY b ORDER BY b`)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var b, n int
		if err := rows.Scan(&b, &n); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
			return
		}
		st.TranchesAge = append(st.TranchesAge, TrancheAgeCount{Tranche: fmt.Sprintf("%d-%d", b, b+4), Nombre: n})
	}
	httpx.JSON(w, http.StatusOK, st)
}
