package member

import (
	"database/sql"
	"errors"
	"fmt"

	"samparis12/backend/internal/perm"
)

var ErrLastRolesAdmin = errors.New("au moins un adhérent doit pouvoir gérer les rôles et les droits")

// HasFeature : l'adhérent a-t-il cette fonctionnalité d'administration (selon son rôle) ?
func (r *Repository) HasFeature(memberID int64, feature string) bool {
	return perm.Has(r.db, memberID, feature)
}

func (r *Repository) defaultRoleID() (int64, error) {
	var id int64
	err := r.db.QueryRow(`SELECT id FROM app_roles WHERE systeme = TRUE AND est_super = FALSE AND nom = 'Adhérent'`).Scan(&id)
	return id, err
}

// SetRole attribue un rôle à l'adhérent ; son statut bureau / super (utilisé par les salons et les badges) en découle.
func (r *Repository) SetRole(memberID, roleID int64) error {
	res, err := r.db.Exec(`
		UPDATE members m JOIN app_roles r ON r.id = ?
		SET m.role_app_id = r.id, m.is_bureau = r.est_bureau, m.is_super_admin = r.est_super
		WHERE m.id = ?`, roleID, memberID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		var exists int
		if r.db.QueryRow(`SELECT 1 FROM app_roles WHERE id = ?`, roleID).Scan(&exists) != nil {
			return fmt.Errorf("rôle inconnu")
		}
	}
	return nil
}

// otherRolesAdmins : combien d'autres adhérents peuvent gérer les rôles ?
func (r *Repository) otherRolesAdmins(exceptMember int64) (int, error) {
	var n int
	err := r.db.QueryRow(`
		SELECT COUNT(*) FROM members m JOIN app_roles ro ON ro.id = m.role_app_id
		WHERE m.id <> ? AND (ro.est_super = TRUE OR EXISTS (SELECT 1 FROM app_role_features f WHERE f.role_id = ro.id AND f.feature = ?))`,
		exceptMember, perm.RolesAdmin).Scan(&n)
	return n, err
}

// checkRoleChange refuse de retirer à l'adhérent son droit de gérer les rôles s'il est le dernier à l'avoir.
func (r *Repository) checkRoleChange(memberID, newRoleID int64) error {
	if !r.HasFeature(memberID, perm.RolesAdmin) {
		return nil
	}
	var super bool
	var has int
	_ = r.db.QueryRow(`SELECT est_super FROM app_roles WHERE id = ?`, newRoleID).Scan(&super)
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM app_role_features WHERE role_id = ? AND feature = ?`, newRoleID, perm.RolesAdmin).Scan(&has)
	if super || has > 0 {
		return nil
	}
	n, err := r.otherRolesAdmins(memberID)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrLastRolesAdmin
	}
	return nil
}

// checkRemovable : refuse de supprimer le dernier adhérent qui peut gérer les rôles.
func (r *Repository) checkRemovable(memberID int64) error {
	if !r.HasFeature(memberID, perm.RolesAdmin) {
		return nil
	}
	n, err := r.otherRolesAdmins(memberID)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrLastRolesAdmin
	}
	return nil
}

// decorate renseigne le rôle et les fonctionnalités des adhérents (en lot).
func (r *Repository) decorate(ms []*Member) error {
	if len(ms) == 0 {
		return nil
	}
	idx := map[int64]*Member{}
	ph := ""
	args := make([]any, 0, len(ms))
	for i, m := range ms {
		idx[m.ID] = m
		m.Features = []string{}
		if i > 0 {
			ph += ","
		}
		ph += "?"
		args = append(args, m.ID)
	}
	rows, err := r.db.Query(`
		SELECT m.id, r.id, r.nom, r.est_super FROM members m JOIN app_roles r ON r.id = m.role_app_id WHERE m.id IN (`+ph+`)`, args...)
	if err != nil {
		return err
	}
	type ro struct {
		nom   string
		super bool
	}
	roles := map[int64]ro{}
	byMember := map[int64]int64{}
	for rows.Next() {
		var mid, rid int64
		var nom string
		var super bool
		if err := rows.Scan(&mid, &rid, &nom, &super); err != nil {
			rows.Close()
			return err
		}
		roles[rid] = ro{nom, super}
		byMember[mid] = rid
	}
	rows.Close()
	feats := map[int64][]string{}
	for rid, info := range roles {
		f, err := perm.FeaturesOfRole(r.db, rid, info.super)
		if err != nil {
			return err
		}
		feats[rid] = f
	}
	for mid, rid := range byMember {
		m := idx[mid]
		m.RoleApp = &RoleRef{ID: rid, Nom: roles[rid].nom}
		m.Features = append([]string{}, feats[rid]...)
	}
	return nil
}

var _ = sql.ErrNoRows
