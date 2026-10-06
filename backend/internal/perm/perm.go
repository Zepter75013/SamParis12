// Package perm : fonctionnalités d'administration de l'application et droits effectifs d'un adhérent, déduits de son rôle
// (tables app_roles et app_role_features). Les contrôles d'accès du serveur passent tous par ici.
package perm

import (
	"database/sql"
	"errors"
)

// Codes des fonctionnalités (stables : ils sont enregistrés en base).
const (
	MembresAdmin      = "membres.admin"
	EvenementsAdmin   = "evenements.admin"
	DocumentsUpload   = "documents.upload"
	ResultatsSaisie   = "resultats.saisie"
	SalonsCreer       = "messagerie.salons"
	MessagerieModerer = "messagerie.moderer"
	RolesAdmin        = "roles.admin"
)

type Feature struct {
	Code        string `json:"code"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// Catalog : toutes les fonctionnalités qu'un rôle peut recevoir, dans l'ordre d'affichage.
var Catalog = []Feature{
	{MembresAdmin, "Administrer les adhérents", "Onglet Admin Club : créer, modifier et supprimer des adhérents, envoyer l'invitation, générer un code d'accès."},
	{EvenementsAdmin, "Administrer les événements", "Gérer les événements du club (droit réservé pour les prochaines évolutions)."},
	{DocumentsUpload, "Ajouter des documents", "Déposer des plans d'entraînement, résultats et documents officiels dans Plans & Documents."},
	{ResultatsSaisie, "Saisir les résultats", "Saisir, modifier et supprimer les résultats des courses."},
	{SalonsCreer, "Créer des salons de discussion", "Créer des salons dans la messagerie et choisir leurs participants."},
	{MessagerieModerer, "Modérer la messagerie", "Supprimer les messages des autres adhérents."},
	{RolesAdmin, "Gérer les rôles et les droits", "Écran Rôles et droits : créer des rôles, choisir leurs fonctionnalités et les attribuer aux adhérents."},
}

func Valid(code string) bool {
	for _, f := range Catalog {
		if f.Code == code {
			return true
		}
	}
	return false
}

func allCodes() []string {
	out := make([]string, len(Catalog))
	for i, f := range Catalog {
		out[i] = f.Code
	}
	return out
}

// Info : rôle d'un adhérent et fonctionnalités qui en découlent.
type Info struct {
	RoleID    int64
	RoleNom   string
	EstBureau bool
	EstSuper  bool
	Features  []string
}

func (i Info) Has(feature string) bool {
	for _, f := range i.Features {
		if f == feature {
			return true
		}
	}
	return false
}

// FeaturesOfRole : fonctionnalités d'un rôle (toutes si le rôle est « super »).
func FeaturesOfRole(db *sql.DB, roleID int64, super bool) ([]string, error) {
	if super {
		return allCodes(), nil
	}
	rows, err := db.Query(`SELECT feature FROM app_role_features WHERE role_id = ? ORDER BY feature`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var f string
		if err := rows.Scan(&f); err != nil {
			return nil, err
		}
		if Valid(f) {
			out = append(out, f)
		}
	}
	return out, rows.Err()
}

// ForMember : rôle et fonctionnalités d'un adhérent (aucune fonctionnalité s'il n'a pas de rôle).
func ForMember(db *sql.DB, memberID int64) (Info, error) {
	var in Info
	err := db.QueryRow(`
		SELECT r.id, r.nom, r.est_bureau, r.est_super
		FROM members m JOIN app_roles r ON r.id = m.role_app_id WHERE m.id = ?`, memberID).
		Scan(&in.RoleID, &in.RoleNom, &in.EstBureau, &in.EstSuper)
	if errors.Is(err, sql.ErrNoRows) {
		return Info{Features: []string{}}, nil
	}
	if err != nil {
		return Info{}, err
	}
	in.Features, err = FeaturesOfRole(db, in.RoleID, in.EstSuper)
	return in, err
}

// Has : l'adhérent dispose-t-il de cette fonctionnalité ? En cas d'erreur de lecture, la réponse est non.
func Has(db *sql.DB, memberID int64, feature string) bool {
	in, err := ForMember(db, memberID)
	return err == nil && in.Has(feature)
}

// CountWith : combien d'adhérents ont la fonctionnalité, hors les adhérents du rôle exceptRole (0 = aucune exclusion).
func CountWith(db *sql.DB, feature string, exceptRole int64) (int, error) {
	var n int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM members m JOIN app_roles r ON r.id = m.role_app_id
		WHERE r.id <> ? AND (r.est_super = TRUE OR EXISTS (SELECT 1 FROM app_role_features f WHERE f.role_id = r.id AND f.feature = ?))`,
		exceptRole, feature).Scan(&n)
	return n, err
}
