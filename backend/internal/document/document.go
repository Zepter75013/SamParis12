package document

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/member"
)

// Document est un fichier (PDF) mis à disposition des adhérents dans
// l'onglet Plans & Documents — visible et téléchargeable par tous les
// adhérents, ajouté uniquement par le bureau ou un adhérent ayant le
// droit d'upload.
type Document struct {
	ID               int64     `json:"id"`
	Titre            string    `json:"titre"`
	Categorie        string    `json:"categorie"`
	Auteur           string    `json:"auteur"`
	FileURL          string    `json:"fileUrl"`
	UploadedBy       int64     `json:"uploadedBy"`
	UploadedByPrenom string    `json:"uploadedByPrenom"`
	UploadedByNom    string    `json:"uploadedByNom"`
	CreatedAt        time.Time `json:"createdAt"`
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

const documentColumns = `
	d.id, d.titre, d.categorie, d.auteur, d.file_path, d.uploaded_by, m.prenom, m.nom, d.created_at
`

func scanDocument(scan func(...any) error) (*Document, error) {
	var d Document
	if err := scan(&d.ID, &d.Titre, &d.Categorie, &d.Auteur, &d.FileURL, &d.UploadedBy, &d.UploadedByPrenom, &d.UploadedByNom, &d.CreatedAt); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *Repository) List() ([]Document, error) {
	rows, err := r.db.Query(`
		SELECT ` + documentColumns + `
		FROM documents d
		JOIN members m ON m.id = d.uploaded_by
		ORDER BY d.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := []Document{}
	for rows.Next() {
		d, err := scanDocument(rows.Scan)
		if err != nil {
			return nil, err
		}
		docs = append(docs, *d)
	}
	return docs, rows.Err()
}

func (r *Repository) GetByID(id int64) (*Document, error) {
	row := r.db.QueryRow(`
		SELECT `+documentColumns+`
		FROM documents d
		JOIN members m ON m.id = d.uploaded_by
		WHERE d.id = ?`, id)
	return scanDocument(row.Scan)
}

func (r *Repository) Create(titre, categorie, auteur, filePath string, uploadedBy int64) (int64, error) {
	res, err := r.db.Exec(`
		INSERT INTO documents (titre, categorie, auteur, file_path, uploaded_by)
		VALUES (?, ?, ?, ?, ?)`,
		titre, categorie, auteur, filePath, uploadedBy,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// GetByCategorie retourne le document actuellement en place pour une
// catégorie (case) donnée — chaque catégorie n'a qu'un seul document à la fois.
func (r *Repository) GetByCategorie(categorie string) (*Document, error) {
	row := r.db.QueryRow(`
		SELECT `+documentColumns+`
		FROM documents d
		JOIN members m ON m.id = d.uploaded_by
		WHERE d.categorie = ?`, categorie)
	return scanDocument(row.Scan)
}

func (r *Repository) Replace(id int64, titre, auteur, filePath string, uploadedBy int64) error {
	_, err := r.db.Exec(`
		UPDATE documents SET titre = ?, auteur = ?, file_path = ?, uploaded_by = ?, created_at = CURRENT_TIMESTAMP
		WHERE id = ?`,
		titre, auteur, filePath, uploadedBy, id,
	)
	return err
}

type Handler struct {
	repo       *Repository
	memberRepo *member.Repository
}

func NewHandler(repo *Repository, memberRepo *member.Repository) *Handler {
	return &Handler{repo: repo, memberRepo: memberRepo}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	docs, err := h.repo.List()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible de charger les documents")
		return
	}
	httpx.JSON(w, http.StatusOK, docs)
}

const documentUploadDir = "uploads/documents"
const maxDocumentSize = 20 << 20 // 20 Mo

// canUpload vérifie en base (plutôt que dans le jeton JWT) que l'adhérent
// est bureau ou dispose du droit d'upload — évite qu'un droit accordé
// après la connexion nécessite une reconnexion pour prendre effet.
func (h *Handler) canUpload(memberID int64) (bool, error) {
	m, err := h.memberRepo.GetByID(memberID)
	if err != nil {
		return false, err
	}
	return m.IsBureau || m.DroitUploadDocuments, nil
}

func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	memberID, ok := member.MemberIDFromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "non authentifié")
		return
	}
	allowed, err := h.canUpload(memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	if !allowed {
		httpx.Error(w, http.StatusForbidden, "vous n'avez pas le droit d'ajouter des documents")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxDocumentSize)
	if err := r.ParseMultipartForm(maxDocumentSize); err != nil {
		httpx.Error(w, http.StatusBadRequest, "fichier trop volumineux (20 Mo maximum)")
		return
	}

	titre := strings.TrimSpace(r.FormValue("titre"))
	categorie := strings.TrimSpace(r.FormValue("categorie"))
	auteur := strings.TrimSpace(r.FormValue("auteur"))
	if titre == "" || categorie == "" {
		httpx.Error(w, http.StatusBadRequest, "le titre et la catégorie sont obligatoires")
		return
	}

	// Chaque catégorie (case) n'a qu'un seul document à la fois : un nouvel
	// upload dans la même case remplace le document existant, et l'ancien
	// fichier physique est supprimé pour ne pas s'accumuler sur le disque.
	existing, err := h.repo.GetByCategorie(categorie)
	hasExisting := err == nil

	file, _, err := r.FormFile("document")
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "aucun fichier reçu")
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	if contentType != "application/pdf" {
		httpx.Error(w, http.StatusBadRequest, "seuls les fichiers PDF sont acceptés")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}

	if err := os.MkdirAll(documentUploadDir, 0o755); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le document")
		return
	}

	tokenBytes := make([]byte, 8)
	if _, err := rand.Read(tokenBytes); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	filename := hex.EncodeToString(tokenBytes) + ".pdf"
	dstPath := filepath.Join(documentUploadDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le document")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le document")
		return
	}

	fileURL := "/uploads/documents/" + filename

	var id int64
	if hasExisting {
		id = existing.ID
		err = h.repo.Replace(id, titre, auteur, fileURL, memberID)
	} else {
		id, err = h.repo.Create(titre, categorie, auteur, fileURL, memberID)
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "impossible d'enregistrer le document")
		return
	}

	if hasExisting {
		oldPath := filepath.Join(documentUploadDir, filepath.Base(existing.FileURL))
		_ = os.Remove(oldPath)
	}

	d, err := h.repo.GetByID(id)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
		return
	}
	httpx.JSON(w, http.StatusCreated, d)
}
