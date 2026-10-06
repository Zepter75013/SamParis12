// Package chat : messagerie de l'espace adhérent (salons par groupe, salons créés, messages privés),
// avec diffusion en temps réel par événements serveur (SSE).
package chat

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	maxBody    = 2000
	pageSize   = 50
	maxMembers = 200
)

var (
	ErrForbidden = errors.New("accès refusé")
	ErrNotFound  = errors.New("introuvable")
)

// Person : l'adhérent qui fait la requête (rechargé en base à chaque appel : groupe, bureau et droits peuvent changer).
type Person struct {
	ID          int64
	Prenom      string
	Nom         string
	PhotoURL    string
	Groupe      string
	IsBureau    bool
	IsSuper     bool
	CanCreate   bool // droit « créer des salons » ou SuperAdmin
	AnyBureauOK bool
}

type Last struct {
	ID        int64     `json:"id"`
	Auteur    string    `json:"auteur"`
	Texte     string    `json:"texte"`
	CreatedAt time.Time `json:"createdAt"`
}

type Room struct {
	ID       int64  `json:"id"`
	Kind     string `json:"kind"` // auto | custom | dm
	Nom      string `json:"nom"`
	PhotoURL string `json:"photoUrl"`
	OtherID  int64  `json:"otherId,omitempty"` // message privé : l'autre adhérent
	Members  int    `json:"members"`
	Unread   int    `json:"unread"`
	Last     *Last  `json:"last"`
	CanAdd   bool   `json:"canAdd"`
}

type Reply struct {
	ID     int64  `json:"id"`
	Auteur string `json:"auteur"`
	Texte  string `json:"texte"`
}

type Message struct {
	ID        int64     `json:"id"`
	RoomID    int64     `json:"roomId"`
	SenderID  int64     `json:"senderId"`
	Auteur    string    `json:"auteur"`
	PhotoURL  string    `json:"photoUrl"`
	Texte     string    `json:"texte"`
	Deleted   bool      `json:"deleted"`
	Reply     *Reply    `json:"reply"`
	CreatedAt time.Time `json:"createdAt"`
}

type Repository struct{ db *sql.DB }

func NewRepository(db *sql.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Person(id int64) (*Person, error) {
	var p Person
	var droit bool
	err := r.db.QueryRow(`
		SELECT id, prenom, nom, photo_path, groupe, is_bureau, is_super_admin, droit_creer_salons
		FROM members WHERE id = ?`, id).
		Scan(&p.ID, &p.Prenom, &p.Nom, &p.PhotoURL, &p.Groupe, &p.IsBureau, &p.IsSuper, &droit)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.CanCreate = droit || p.IsSuper
	return &p, nil
}

// Prédicat SQL : « l'adhérent (groupe ?, bureau ?, id ?) fait partie du salon r ».
const memberOfRoom = `(
	(r.kind = 'auto' AND (
		r.auto_rule = 'all'
		OR (r.auto_rule = 'running' AND ? = 'Running')
		OR (r.auto_rule = 'marche' AND ? IN ('Marche Nordique Sportive', 'Marche Loisir'))
		OR (r.auto_rule = 'bureau' AND ?)))
	OR EXISTS (SELECT 1 FROM chat_room_members cm WHERE cm.room_id = r.id AND cm.member_id = ?)
)`

func memberArgs(p *Person) []any { return []any{p.Groupe, p.Groupe, p.IsBureau, p.ID} }

func (r *Repository) roomCols() string {
	return `r.id, r.kind, COALESCE(r.auto_rule, ''), r.nom, COALESCE(r.created_by, 0)`
}

type roomRow struct {
	id        int64
	kind      string
	rule      string
	nom       string
	createdBy int64
}

func (r *Repository) loadRoom(id int64) (*roomRow, error) {
	var rr roomRow
	err := r.db.QueryRow(`SELECT id, kind, COALESCE(auto_rule, ''), nom, COALESCE(created_by, 0) FROM chat_rooms WHERE id = ?`, id).
		Scan(&rr.id, &rr.kind, &rr.rule, &rr.nom, &rr.createdBy)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &rr, err
}

// Access vérifie que l'adhérent fait partie du salon.
func (r *Repository) Access(roomID int64, p *Person) (*roomRow, error) {
	var one int
	args := append(memberArgs(p), roomID)
	err := r.db.QueryRow(`SELECT 1 FROM chat_rooms r WHERE `+memberOfRoom+` AND r.id = ?`, args...).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	return r.loadRoom(roomID)
}

func ruleMembersSQL(rule string) (string, []any) {
	switch rule {
	case "running":
		return `SELECT id FROM members WHERE groupe = 'Running'`, nil
	case "marche":
		return `SELECT id FROM members WHERE groupe IN ('Marche Nordique Sportive', 'Marche Loisir')`, nil
	case "bureau":
		return `SELECT id FROM members WHERE is_bureau = TRUE`, nil
	default:
		return `SELECT id FROM members`, nil
	}
}

// MemberIDs : tous les adhérents d'un salon (pour diffuser les événements).
func (r *Repository) MemberIDs(rr *roomRow) ([]int64, error) {
	var rows *sql.Rows
	var err error
	if rr.kind == "auto" {
		q, _ := ruleMembersSQL(rr.rule)
		rows, err = r.db.Query(q)
	} else {
		rows, err = r.db.Query(`SELECT member_id FROM chat_room_members WHERE room_id = ?`, rr.id)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *Repository) Rooms(p *Person) ([]Room, error) {
	args := []any{p.ID, p.ID}
	args = append(args, memberArgs(p)...)
	rows, err := r.db.Query(`
		SELECT `+r.roomCols()+`,
			(SELECT COUNT(*) FROM chat_messages m
			  WHERE m.room_id = r.id AND m.id > COALESCE(rd.last_read_id, 0) AND m.sender_id <> ? AND m.deleted_at IS NULL)
		FROM chat_rooms r
		LEFT JOIN chat_reads rd ON rd.room_id = r.id AND rd.member_id = ?
		WHERE `+memberOfRoom, args...)
	if err != nil {
		return nil, err
	}
	type tmp struct {
		rr     roomRow
		unread int
	}
	var list []tmp
	for rows.Next() {
		var t tmp
		if err := rows.Scan(&t.rr.id, &t.rr.kind, &t.rr.rule, &t.rr.nom, &t.rr.createdBy, &t.unread); err != nil {
			rows.Close()
			return nil, err
		}
		list = append(list, t)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]Room, 0, len(list))
	for _, t := range list {
		room := Room{ID: t.rr.id, Kind: t.rr.kind, Nom: t.rr.nom, Unread: t.unread}
		ids, err := r.MemberIDs(&t.rr)
		if err != nil {
			return nil, err
		}
		room.Members = len(ids)
		if t.rr.kind == "dm" {
			for _, id := range ids {
				if id != p.ID {
					room.OtherID = id
				}
			}
			if room.OtherID != 0 {
				_ = r.db.QueryRow(`SELECT CONCAT(prenom, ' ', nom), photo_path FROM members WHERE id = ?`, room.OtherID).Scan(&room.Nom, &room.PhotoURL)
			}
		}
		room.CanAdd = t.rr.kind == "custom" && (p.IsSuper || t.rr.createdBy == p.ID)
		var l Last
		err = r.db.QueryRow(`
			SELECT m.id, CONCAT(s.prenom, ' ', s.nom), m.body, m.created_at
			FROM chat_messages m JOIN members s ON s.id = m.sender_id
			WHERE m.room_id = ? AND m.deleted_at IS NULL ORDER BY m.id DESC LIMIT 1`, t.rr.id).
			Scan(&l.ID, &l.Auteur, &l.Texte, &l.CreatedAt)
		if err == nil {
			room.Last = &l
		} else if !errors.Is(err, sql.ErrNoRows) {
			return nil, err
		}
		out = append(out, room)
	}
	return out, nil
}

func shorten(s string) string {
	r := []rune(s)
	if len(r) > 140 {
		return string(r[:140]) + "…"
	}
	return s
}

const messageSelect = `
	SELECT m.id, m.room_id, m.sender_id, CONCAT(s.prenom, ' ', s.nom), s.photo_path,
	       m.body, m.deleted_at IS NOT NULL, m.created_at,
	       q.id, CONCAT(qs.prenom, ' ', qs.nom), q.body, q.deleted_at IS NOT NULL
	FROM chat_messages m
	JOIN members s ON s.id = m.sender_id
	LEFT JOIN chat_messages q ON q.id = m.reply_to
	LEFT JOIN members qs ON qs.id = q.sender_id`

func scanMessage(scan func(...any) error) (*Message, error) {
	var m Message
	var qID sql.NullInt64
	var qAuteur, qTexte sql.NullString
	var qDeleted sql.NullBool
	if err := scan(&m.ID, &m.RoomID, &m.SenderID, &m.Auteur, &m.PhotoURL, &m.Texte, &m.Deleted, &m.CreatedAt,
		&qID, &qAuteur, &qTexte, &qDeleted); err != nil {
		return nil, err
	}
	if m.Deleted {
		m.Texte = ""
	}
	if qID.Valid {
		m.Reply = &Reply{ID: qID.Int64, Auteur: qAuteur.String, Texte: shorten(qTexte.String)}
		if qDeleted.Bool {
			m.Reply.Texte = ""
		}
	}
	return &m, nil
}

// Messages : une page de messages (les plus récents d'abord côté SQL, renvoyés du plus ancien au plus récent).
func (r *Repository) Messages(roomID, before int64) ([]Message, error) {
	q := messageSelect + ` WHERE m.room_id = ?`
	args := []any{roomID}
	if before > 0 {
		q += ` AND m.id < ?`
		args = append(args, before)
	}
	q += ` ORDER BY m.id DESC LIMIT ?`
	args = append(args, pageSize)
	rows, err := r.db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Message
	for rows.Next() {
		m, err := scanMessage(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out, rows.Err()
}

func (r *Repository) Message(id int64) (*Message, error) {
	m, err := scanMessage(r.db.QueryRow(messageSelect+` WHERE m.id = ?`, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return m, err
}

// OtherRead : jusqu'où l'autre adhérent d'un message privé a lu (coches bleues).
func (r *Repository) OtherRead(roomID, me int64) int64 {
	var n sql.NullInt64
	_ = r.db.QueryRow(`SELECT MAX(last_read_id) FROM chat_reads WHERE room_id = ? AND member_id <> ?`, roomID, me).Scan(&n)
	return n.Int64
}

func (r *Repository) AddMessage(roomID, sender int64, body string, replyTo int64) (*Message, error) {
	body = strings.TrimSpace(body)
	if body == "" || len([]rune(body)) > maxBody {
		return nil, fmt.Errorf("message vide ou trop long (%d caractères maximum)", maxBody)
	}
	var reply any
	if replyTo > 0 {
		var one int
		if err := r.db.QueryRow(`SELECT 1 FROM chat_messages WHERE id = ? AND room_id = ?`, replyTo, roomID).Scan(&one); err == nil {
			reply = replyTo
		}
	}
	res, err := r.db.Exec(`INSERT INTO chat_messages (room_id, sender_id, body, reply_to) VALUES (?, ?, ?, ?)`, roomID, sender, body, reply)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	// l'auteur a forcément lu ses propres messages
	_ = r.MarkRead(roomID, sender, id)
	return r.Message(id)
}

func (r *Repository) MarkRead(roomID, memberID, upTo int64) error {
	_, err := r.db.Exec(`
		INSERT INTO chat_reads (room_id, member_id, last_read_id) VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))`, roomID, memberID, upTo)
	return err
}

// DeleteMessage : suppression logique, par l'auteur ou par le bureau (modération).
func (r *Repository) DeleteMessage(id int64, p *Person) (*Message, error) {
	m, err := r.Message(id)
	if err != nil {
		return nil, err
	}
	if m.SenderID != p.ID && !p.IsBureau {
		return nil, ErrForbidden
	}
	if _, err := r.db.Exec(`UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`, id); err != nil {
		return nil, err
	}
	return m, nil
}

// OpenDM retrouve ou crée le message privé entre deux adhérents.
func (r *Repository) OpenDM(me, other int64) (int64, error) {
	if me == other {
		return 0, fmt.Errorf("impossible d'écrire à soi-même")
	}
	var one int
	if err := r.db.QueryRow(`SELECT 1 FROM members WHERE id = ?`, other).Scan(&one); err != nil {
		return 0, ErrNotFound
	}
	lo, hi := me, other
	if lo > hi {
		lo, hi = hi, lo
	}
	key := fmt.Sprintf("%d-%d", lo, hi)
	var id int64
	err := r.db.QueryRow(`SELECT id FROM chat_rooms WHERE dm_key = ?`, key).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	res, err := r.db.Exec(`INSERT INTO chat_rooms (kind, dm_key, created_by) VALUES ('dm', ?, ?)`, key, me)
	if err != nil {
		// création simultanée par l'autre adhérent
		if err2 := r.db.QueryRow(`SELECT id FROM chat_rooms WHERE dm_key = ?`, key).Scan(&id); err2 == nil {
			return id, nil
		}
		return 0, err
	}
	id, _ = res.LastInsertId()
	if _, err := r.db.Exec(`INSERT IGNORE INTO chat_room_members (room_id, member_id) VALUES (?, ?), (?, ?)`, id, me, id, other); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *Repository) CreateRoom(nom string, creator int64, memberIDs []int64) (int64, error) {
	nom = strings.TrimSpace(nom)
	if nom == "" || len([]rune(nom)) > 100 {
		return 0, fmt.Errorf("le nom du salon est obligatoire (100 caractères maximum)")
	}
	if len(memberIDs) > maxMembers {
		return 0, fmt.Errorf("trop de participants")
	}
	res, err := r.db.Exec(`INSERT INTO chat_rooms (kind, nom, created_by) VALUES ('custom', ?, ?)`, nom, creator)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	if err := r.AddMembers(id, append([]int64{creator}, memberIDs...)); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *Repository) AddMembers(roomID int64, ids []int64) error {
	for _, id := range ids {
		if _, err := r.db.Exec(`INSERT IGNORE INTO chat_room_members (room_id, member_id) SELECT ?, id FROM members WHERE id = ?`, roomID, id); err != nil {
			return err
		}
	}
	return nil
}

// Participants : liste des membres d'un salon (pour l'en-tête).
type Participant struct {
	ID       int64  `json:"id"`
	Nom      string `json:"nom"`
	PhotoURL string `json:"photoUrl"`
}

func (r *Repository) Participants(rr *roomRow) ([]Participant, error) {
	var rows *sql.Rows
	var err error
	if rr.kind == "auto" {
		q, _ := ruleMembersSQL(rr.rule)
		rows, err = r.db.Query(`SELECT id, CONCAT(prenom, ' ', nom), photo_path FROM members WHERE id IN (` + q + `) ORDER BY prenom, nom`)
	} else {
		rows, err = r.db.Query(`
			SELECT m.id, CONCAT(m.prenom, ' ', m.nom), m.photo_path
			FROM chat_room_members cm JOIN members m ON m.id = cm.member_id
			WHERE cm.room_id = ? ORDER BY m.prenom, m.nom`, rr.id)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Participant{}
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.ID, &p.Nom, &p.PhotoURL); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
