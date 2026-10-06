// Package role : rôles de l'application et fonctionnalités accordées à chaque rôle (écran « Rôles et droits »).
package role

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/member"
	"samparis12/backend/internal/perm"
)

type Role struct {
	ID          int64    `json:"id"`
	Nom         string   `json:"nom"`
	Description string   `json:"description"`
	EstBureau   bool     `json:"estBureau"`
	EstSuper    bool     `json:"estSuper"`
	Systeme     bool     `json:"systeme"`
	Features    []string `json:"features"`
	Membres     int      `json:"membres"`
}

type Repository struct{ db *sql.DB }

func NewRepository(db *sql.DB) *Repository { return &Repository{db: db} }

var errNotFound = errors.New("rôle introuvable")

func (r *Repository) List() ([]Role, error) {
	rows, err := r.db.Query(`
		SELECT r.id, r.nom, r.description, r.est_bureau, r.est_super, r.systeme,
		       (SELECT COUNT(*) FROM members m WHERE m.role_app_id = r.id)
		FROM app_roles r
		ORDER BY r.est_super DESC, r.systeme DESC, r.est_bureau DESC, r.nom`)
	if err != nil {
		return nil, err
	}
	var out []Role
	for rows.Next() {
		var ro Role
		if err := rows.Scan(&ro.ID, &ro.Nom, &ro.Description, &ro.EstBureau, &ro.EstSuper, &ro.Systeme, &ro.Membres); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, ro)
	}
	rows.Close()
	for i := range out {
		f, err := perm.FeaturesOfRole(r.db, out[i].ID, out[i].EstSuper)
		if err != nil {
			return nil, err
		}
		out[i].Features = f
	}
	// « Adhérent » en premier : c'est le rôle le plus simple
	for i := range out {
		if out[i].Systeme && !out[i].EstSuper {
			out[0], out[i] = out[i], out[0]
			break
		}
	}
	return out, nil
}

func (r *Repository) Get(id int64) (*Role, error) {
	list, err := r.List()
	if err != nil {
		return nil, err
	}
	for i := range list {
		if list[i].ID == id {
			return &list[i], nil
		}
	}
	return nil, errNotFound
}

// Create : un nouveau rôle, sans aucune fonctionnalité.
func (r *Repository) Create(nom, description string, estBureau bool) (int64, error) {
	res, err := r.db.Exec(`INSERT INTO app_roles (nom, description, est_bureau) VALUES (?, ?, ?)`, nom, description, estBureau)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// Save enregistre le nom, la description, le statut bureau et les fonctionnalités d'un rôle.
func (r *Repository) Save(ro *Role, nom, description string, estBureau bool, features []string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if ro.Systeme {
		// rôles de base : seule la description change
		if _, err := tx.Exec(`UPDATE app_roles SET description = ? WHERE id = ?`, description, ro.ID); err != nil {
			return err
		}
		return tx.Commit()
	}
	if _, err := tx.Exec(`UPDATE app_roles SET nom = ?, description = ?, est_bureau = ? WHERE id = ?`, nom, description, estBureau, ro.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM app_role_features WHERE role_id = ?`, ro.ID); err != nil {
		return err
	}
	for _, f := range features {
		if _, err := tx.Exec(`INSERT INTO app_role_features (role_id, feature) VALUES (?, ?)`, ro.ID, f); err != nil {
			return err
		}
	}
	// le statut bureau suit le rôle
	if _, err := tx.Exec(`UPDATE members SET is_bureau = ? WHERE role_app_id = ?`, estBureau, ro.ID); err != nil {
		return err
	}
	return tx.Commit()
}

// Delete supprime un rôle : ses adhérents repassent au rôle « Adhérent ».
func (r *Repository) Delete(id int64) (int, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var base int64
	if err := tx.QueryRow(`SELECT id FROM app_roles WHERE systeme = TRUE AND est_super = FALSE AND nom = 'Adhérent'`).Scan(&base); err != nil {
		return 0, err
	}
	res, err := tx.Exec(`UPDATE members SET role_app_id = ?, is_bureau = FALSE, is_super_admin = FALSE WHERE role_app_id = ?`, base, id)
	if err != nil {
		return 0, err
	}
	moved, _ := res.RowsAffected()
	if _, err := tx.Exec(`DELETE FROM app_roles WHERE id = ?`, id); err != nil {
		return 0, err
	}
	return int(moved), tx.Commit()
}

// ---- HTTP ----

type Handler struct {
	repo *Repository
	db   *sql.DB
}

func NewHandler(db *sql.DB) *Handler { return &Handler{repo: NewRepository(db), db: db} }

type listResponse struct {
	Roles    []Role         `json:"roles"`
	Features []perm.Feature `json:"features"`
	CanEdit  bool           `json:"canEdit"`
}

func (h *Handler) caller(r *http.Request) int64 {
	id, _ := member.MemberIDFromContext(r.Context())
	return id
}

// List : visible par qui administre les adhérents (liste déroulante de la fiche) ou les rôles ; modifiable avec roles.admin.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	id := h.caller(r)
	can := perm.Has(h.db, id, perm.RolesAdmin)
	if !can && !perm.Has(h.db, id, perm.MembresAdmin) {
		httpx.Error(w, http.StatusForbidden, "droit insuffisant")
		return
	}
	roles, err := h.repo.List()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les rôles")
		return
	}
	httpx.JSON(w, http.StatusOK, listResponse{Roles: roles, Features: perm.Catalog, CanEdit: can})
}

func (h *Handler) requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	if !perm.Has(h.db, h.caller(r), perm.RolesAdmin) {
		httpx.Error(w, http.StatusForbidden, "seul un administrateur des rôles peut faire cela")
		return false
	}
	return true
}

type input struct {
	Nom         string   `json:"nom"`
	Description string   `json:"description"`
	EstBureau   bool     `json:"estBureau"`
	Features    []string `json:"features"`
}

func cleanInput(in *input) error {
	in.Nom = strings.TrimSpace(in.Nom)
	in.Description = strings.TrimSpace(in.Description)
	if in.Nom == "" || utf8.RuneCountInString(in.Nom) > 60 {
		return fmt.Errorf("le nom du rôle est obligatoire (60 caractères maximum)")
	}
	if utf8.RuneCountInString(in.Description) > 255 {
		return fmt.Errorf("la description est trop longue (255 caractères maximum)")
	}
	seen := map[string]bool{}
	var f []string
	for _, c := range in.Features {
		if !perm.Valid(c) {
			return fmt.Errorf("fonctionnalité inconnue : %s", c)
		}
		if !seen[c] {
			seen[c] = true
			f = append(f, c)
		}
	}
	in.Features = f
	return nil
}

func isDuplicate(err error) bool {
	return err != nil && strings.Contains(err.Error(), "Duplicate entry")
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	var in input
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if err := cleanInput(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	id, err := h.repo.Create(in.Nom, in.Description, in.EstBureau)
	if isDuplicate(err) {
		httpx.Error(w, http.StatusConflict, "un rôle porte déjà ce nom")
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de créer le rôle")
		return
	}
	ro, _ := h.repo.Get(id)
	httpx.JSON(w, http.StatusCreated, ro)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	ro, err := h.repo.Get(id)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "rôle introuvable")
		return
	}
	var in input
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if ro.Systeme {
		in.Nom = ro.Nom
		in.Features = ro.Features
		in.EstBureau = ro.EstBureau
	}
	if err := cleanInput(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	// ne jamais laisser le club sans personne pour gérer les rôles
	if !ro.Systeme && has(ro.Features, perm.RolesAdmin) && !has(in.Features, perm.RolesAdmin) {
		n, err := perm.CountWith(h.db, perm.RolesAdmin, ro.ID)
		if err != nil || n == 0 {
			httpx.Error(w, http.StatusConflict, "au moins un adhérent doit pouvoir gérer les rôles et les droits")
			return
		}
	}
	if err := h.repo.Save(ro, in.Nom, in.Description, in.EstBureau, in.Features); err != nil {
		if isDuplicate(err) {
			httpx.Error(w, http.StatusConflict, "un rôle porte déjà ce nom")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le rôle")
		return
	}
	out, _ := h.repo.Get(id)
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if !h.requireAdmin(w, r) {
		return
	}
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	ro, err := h.repo.Get(id)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "rôle introuvable")
		return
	}
	if ro.Systeme {
		httpx.Error(w, http.StatusConflict, "ce rôle de base ne peut pas être supprimé")
		return
	}
	if has(ro.Features, perm.RolesAdmin) {
		if n, err := perm.CountWith(h.db, perm.RolesAdmin, ro.ID); err != nil || n == 0 {
			httpx.Error(w, http.StatusConflict, "au moins un adhérent doit pouvoir gérer les rôles et les droits")
			return
		}
	}
	moved, err := h.repo.Delete(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de supprimer le rôle")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]int{"adherentsReclasses": moved})
}

func has(list []string, f string) bool {
	for _, x := range list {
		if x == f {
			return true
		}
	}
	return false
}
