// Package notif : notifications de l'espace adhérent, par push (navigateur, téléphone) et par e-mail.
//
// Un événement (nouveau message, nouvelle course, rappel la veille d'une course, nouveau document) crée une notification
// par destinataire : le push part tout de suite vers ses appareils abonnés ; l'e-mail n'est envoyé qu'une heure plus tard,
// et seulement si l'adhérent n'a pas vu l'élément entre-temps. Chaque adhérent choisit, par type et par canal, ce qu'il
// reçoit (par défaut : e-mail activé, push actif dès qu'il a abonné un appareil).
package notif

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"sync"
	"time"
	_ "time/tzdata" // fuseau Europe/Paris même dans une image Docker sans données de fuseaux

	webpush "github.com/SherClockHolmes/webpush-go"

	"samparis12/backend/internal/config"
	"samparis12/backend/internal/mailer"
)

const (
	Message  = "message"
	Course   = "course"
	Rappel   = "rappel"
	Document = "document"

	delaiEmail  = "1 HOUR" // un e-mail seulement si la notification n'a pas été vue une heure après
	heureRappel = 18       // rappel des courses du lendemain, à partir de 18 h (heure de Paris)
)

// categorie : préférence (colonne) qui gouverne un type de notification.
func categorie(kind string) string {
	switch kind {
	case Message:
		return "messages"
	case Course, Rappel:
		return "courses"
	default:
		return "documents"
	}
}

// Event : ce qui vient de se passer, et pour qui.
type Event struct {
	Kind    string
	RefID   int64   // discussion, course ou document
	Membres []int64 // destinataires (l'auteur de l'événement est à exclure par l'appelant)
	Titre   string
	Corps   string
	URL     string // chemin dans le site, ouvert au clic sur la notification
	Grouper bool   // messages : une seule notification en attente par discussion, avec le nombre de messages
}

type Service struct {
	db      *sql.DB
	cfg     config.Config
	mail    *mailer.Mailer
	paris   *time.Location
	mu      sync.Mutex
	rappels string             // dernier jour où les rappels ont été envoyés (AAAA-MM-JJ)
	client  webpush.HTTPClient // client HTTP du push (nil : client par défaut ; remplacé dans les tests)
	horloge func() time.Time   // heure courante (nil : time.Now ; réglable dans les tests)
}

func (s *Service) maintenant() time.Time {
	if s.horloge != nil {
		return s.horloge()
	}
	return time.Now()
}

func New(db *sql.DB, cfg config.Config, mail *mailer.Mailer) *Service {
	paris, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		paris = time.UTC
	}
	return &Service{db: db, cfg: cfg, mail: mail, paris: paris}
}

// PushActif : les clés VAPID sont configurées.
func (s *Service) PushActif() bool {
	return s != nil && s.cfg.VAPIDPublicKey != "" && s.cfg.VAPIDPrivateKey != ""
}

// Prefs : choix d'un adhérent (valeurs par défaut s'il n'a rien réglé).
type Prefs struct {
	Push map[string]bool `json:"push"`
	Mail map[string]bool `json:"mail"`
}

var categories = []string{"messages", "courses", "documents"}

func prefsParDefaut() Prefs {
	p := Prefs{Push: map[string]bool{}, Mail: map[string]bool{}}
	for _, c := range categories {
		p.Push[c], p.Mail[c] = true, true
	}
	return p
}

func (s *Service) prefs(ids []int64) map[int64]Prefs {
	out := map[int64]Prefs{}
	for _, id := range ids {
		out[id] = prefsParDefaut()
	}
	if len(ids) == 0 {
		return out
	}
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	rows, err := s.db.Query(`SELECT member_id, push_messages, push_courses, push_documents, mail_messages, mail_courses, mail_documents
		FROM notif_prefs WHERE member_id IN (?`+strings.Repeat(",?", len(ids)-1)+`)`, args...)
	if err != nil {
		log.Printf("notif: préférences : %v", err)
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var pm, pc, pd, mm, mc, md bool
		if rows.Scan(&id, &pm, &pc, &pd, &mm, &mc, &md) == nil {
			out[id] = Prefs{
				Push: map[string]bool{"messages": pm, "courses": pc, "documents": pd},
				Mail: map[string]bool{"messages": mm, "courses": mc, "documents": md},
			}
		}
	}
	return out
}

// Notify enregistre et envoie une notification à chaque destinataire, sans ralentir la requête qui l'a déclenchée.
func (s *Service) Notify(e Event) {
	if s == nil || len(e.Membres) == 0 {
		return
	}
	go s.notify(e)
}

func (s *Service) notify(e Event) {
	vus := map[int64]bool{}
	ids := make([]int64, 0, len(e.Membres))
	for _, id := range e.Membres {
		if id > 0 && !vus[id] {
			vus[id] = true
			ids = append(ids, id)
		}
	}
	prefs := s.prefs(ids)
	cat := categorie(e.Kind)
	for _, id := range ids {
		p := prefs[id]
		titre, corps, nombre := e.Titre, e.Corps, 1
		groupe := false
		if e.Grouper {
			// une notification de cette discussion attend encore d'être vue : on la complète au lieu d'en créer une autre
			var nid int64
			if err := s.db.QueryRow(`SELECT id, nombre FROM notifications WHERE member_id = ? AND kind = ? AND ref_id = ? AND seen_at IS NULL AND mailed_at IS NULL ORDER BY id DESC LIMIT 1`,
				id, e.Kind, e.RefID).Scan(&nid, &nombre); err == nil {
				nombre++
				groupe = true
				if _, err := s.db.Exec(`UPDATE notifications SET nombre = ?, titre = ?, corps = ? WHERE id = ?`, nombre, titre, corps, nid); err != nil {
					log.Printf("notif: regroupement : %v", err)
				}
			}
		}
		if !groupe {
			due := "NULL"
			if p.Mail[cat] {
				due = "NOW() + INTERVAL " + delaiEmail
			}
			if _, err := s.db.Exec(`INSERT INTO notifications (member_id, kind, ref_id, titre, corps, url, mail_due_at) VALUES (?, ?, ?, ?, ?, ?, `+due+`)`,
				id, e.Kind, e.RefID, tronquer(titre, 200), tronquer(corps, 500), e.URL); err != nil {
				log.Printf("notif: enregistrement : %v", err)
			}
		}
		if p.Push[cat] && s.PushActif() {
			if nombre > 1 {
				corps = fmt.Sprintf("%d nouveaux messages · %s", nombre, corps)
			}
			s.pousser(id, Payload{Titre: titre, Corps: corps, URL: e.URL, Tag: fmt.Sprintf("%s-%d", e.Kind, e.RefID)})
		}
	}
}

// Payload : contenu reçu par le service worker du site (public/sw.js).
type Payload struct {
	Titre string `json:"titre"`
	Corps string `json:"corps"`
	URL   string `json:"url"`
	Tag   string `json:"tag"`
}

// pousser envoie le push à tous les appareils abonnés de l'adhérent ; un abonnement expiré ou révoqué est oublié.
// Renvoie le nombre d'appareils atteints.
func (s *Service) pousser(memberID int64, p Payload) int {
	rows, err := s.db.Query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE member_id = ?`, memberID)
	if err != nil {
		log.Printf("notif: abonnements : %v", err)
		return 0
	}
	type abo struct {
		id                     int64
		endpoint, p256dh, auth string
	}
	var abos []abo
	for rows.Next() {
		var a abo
		if rows.Scan(&a.id, &a.endpoint, &a.p256dh, &a.auth) == nil {
			abos = append(abos, a)
		}
	}
	rows.Close()
	corps, _ := json.Marshal(p)
	ok := 0
	for _, a := range abos {
		res, err := webpush.SendNotification(corps, &webpush.Subscription{Endpoint: a.endpoint, Keys: webpush.Keys{P256dh: a.p256dh, Auth: a.auth}}, &webpush.Options{
			Subscriber:      strings.TrimPrefix(s.cfg.VAPIDSubject, "mailto:"),
			VAPIDPublicKey:  s.cfg.VAPIDPublicKey,
			VAPIDPrivateKey: s.cfg.VAPIDPrivateKey,
			TTL:             24 * 3600,
			Urgency:         webpush.UrgencyHigh,
			HTTPClient:      s.client,
		})
		if err != nil {
			log.Printf("notif: push vers l'appareil %d : %v", a.id, err)
			continue
		}
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
		switch {
		case res.StatusCode == 404 || res.StatusCode == 410: // abonnement expiré ou retiré par l'adhérent
			s.db.Exec(`DELETE FROM push_subscriptions WHERE id = ?`, a.id)
		case res.StatusCode >= 400:
			log.Printf("notif: push vers l'appareil %d refusé (%d)", a.id, res.StatusCode)
		default:
			ok++
		}
	}
	return ok
}

// Vu : l'adhérent a vu ces éléments (discussion lue, écran ouvert) ; plus d'e-mail à leur sujet.
// refID = 0 : toutes les notifications de ces types.
func (s *Service) Vu(memberID int64, refID int64, kinds ...string) {
	if s == nil || len(kinds) == 0 {
		return
	}
	args := []any{memberID}
	for _, k := range kinds {
		args = append(args, k)
	}
	q := `UPDATE notifications SET seen_at = NOW() WHERE member_id = ? AND seen_at IS NULL AND kind IN (?` + strings.Repeat(",?", len(kinds)-1) + `)`
	if refID > 0 {
		q += ` AND ref_id = ?`
		args = append(args, refID)
	}
	if _, err := s.db.Exec(q, args...); err != nil {
		log.Printf("notif: vu : %v", err)
	}
}

// MembresActifs : adhérents ayant activé leur compte (connectés au moins une fois), sauf ceux exclus.
func (s *Service) MembresActifs(sauf ...int64) []int64 {
	if s == nil {
		return nil
	}
	exclus := map[int64]bool{}
	for _, id := range sauf {
		exclus[id] = true
	}
	rows, err := s.db.Query(`SELECT id FROM members WHERE activated_at IS NOT NULL`)
	if err != nil {
		log.Printf("notif: adhérents : %v", err)
		return nil
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil && !exclus[id] {
			out = append(out, id)
		}
	}
	return out
}

// Demarrer lance la tâche de fond (chaque minute) : e-mails des notifications non vues, rappels des courses du lendemain.
func (s *Service) Demarrer(ctx context.Context) {
	go func() {
		t := time.NewTicker(time.Minute)
		defer t.Stop()
		for {
			s.envoyerEmails()
			s.rappelsVeille()
			select {
			case <-ctx.Done():
				return
			case <-t.C:
			}
		}
	}()
}

func (s *Service) envoyerEmails() {
	rows, err := s.db.Query(`SELECT n.id, n.member_id, n.kind, n.titre, n.corps, n.url, n.nombre, m.email, m.prenom
		FROM notifications n JOIN members m ON m.id = n.member_id
		WHERE n.mailed_at IS NULL AND n.seen_at IS NULL AND n.mail_due_at IS NOT NULL AND n.mail_due_at <= NOW()
		ORDER BY n.member_id, n.id LIMIT 500`)
	if err != nil {
		log.Printf("notif: e-mails en attente : %v", err)
		return
	}
	type ligne struct {
		id   int64
		kind string
		item mailer.NotifItem
	}
	parMembre := map[int64][]ligne{}
	adresses := map[int64][2]string{}
	var ordre []int64
	for rows.Next() {
		var l ligne
		var mid int64
		var url, email, prenom string
		var nombre int
		if rows.Scan(&l.id, &mid, &l.kind, &l.item.Titre, &l.item.Corps, &url, &nombre, &email, &prenom) != nil {
			continue
		}
		if nombre > 1 {
			l.item.Corps = fmt.Sprintf("%d nouveaux messages · dernier : %s", nombre, l.item.Corps)
		}
		l.item.URL = strings.TrimRight(s.cfg.FrontendURL, "/") + url
		if _, ok := parMembre[mid]; !ok {
			ordre = append(ordre, mid)
		}
		parMembre[mid] = append(parMembre[mid], l)
		adresses[mid] = [2]string{email, prenom}
	}
	rows.Close()
	prefs := s.prefs(ordre)
	profil := strings.TrimRight(s.cfg.FrontendURL, "/") + "/espace-adherent/tableau-de-bord?onglet=profil"
	for _, mid := range ordre {
		var items []mailer.NotifItem
		var ids, ignores []any
		for _, l := range parMembre[mid] {
			if prefs[mid].Mail[categorie(l.kind)] { // l'adhérent peut avoir désactivé ces e-mails entre-temps
				items = append(items, l.item)
				ids = append(ids, l.id)
			} else {
				ignores = append(ignores, l.id)
			}
		}
		if len(ignores) > 0 {
			s.db.Exec(`UPDATE notifications SET mail_due_at = NULL WHERE id IN (?`+strings.Repeat(",?", len(ignores)-1)+`)`, ignores...)
		}
		if len(items) == 0 {
			continue
		}
		a := adresses[mid]
		if err := s.mail.SendNotifications(a[0], a[1], items, profil); err != nil {
			log.Printf("notif: e-mail pour l'adhérent %d : %v (nouvel essai dans 15 min)", mid, err)
			s.db.Exec(`UPDATE notifications SET mail_due_at = NOW() + INTERVAL 15 MINUTE WHERE id IN (?`+strings.Repeat(",?", len(ids)-1)+`)`, ids...)
			continue
		}
		s.db.Exec(`UPDATE notifications SET mailed_at = NOW() WHERE id IN (?`+strings.Repeat(",?", len(ids)-1)+`)`, ids...)
	}
}

// rappelsVeille : à partir de 18 h, un rappel aux inscrits des courses du lendemain (une seule fois par course et par inscrit).
func (s *Service) rappelsVeille() {
	maintenant := s.maintenant().In(s.paris)
	jour := maintenant.Format("2006-01-02")
	s.mu.Lock()
	fait := s.rappels == jour
	s.mu.Unlock()
	if fait || maintenant.Hour() < heureRappel {
		return
	}
	demain := maintenant.AddDate(0, 0, 1).Format("2006-01-02")
	rows, err := s.db.Query(`SELECT r.id, r.titre, r.lieu, rr.member_id
		FROM races r JOIN race_registrations rr ON rr.race_id = r.id
		WHERE r.race_date = ? AND NOT EXISTS (
			SELECT 1 FROM notifications n WHERE n.member_id = rr.member_id AND n.kind = ? AND n.ref_id = r.id)`, demain, Rappel)
	if err != nil {
		log.Printf("notif: rappels : %v", err)
		return
	}
	type course struct {
		titre, lieu string
		inscrits    []int64
	}
	courses := map[int64]*course{}
	for rows.Next() {
		var id, mid int64
		var titre, lieu string
		if rows.Scan(&id, &titre, &lieu, &mid) != nil {
			continue
		}
		if courses[id] == nil {
			courses[id] = &course{titre: titre, lieu: lieu}
		}
		courses[id].inscrits = append(courses[id].inscrits, mid)
	}
	rows.Close()
	for id, c := range courses {
		corps := "C'est demain"
		if c.lieu != "" {
			corps += " · " + c.lieu
		}
		s.notify(Event{Kind: Rappel, RefID: id, Membres: c.inscrits, Titre: "Rappel : " + c.titre, Corps: corps + ". Bonne course !", URL: "/espace-adherent/tableau-de-bord?onglet=courses"})
	}
	s.mu.Lock()
	s.rappels = jour
	s.mu.Unlock()
}

func tronquer(s string, n int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= n {
		return string(r)
	}
	return string(r[:n-1]) + "…"
}

// Apercu : début d'un texte pour le corps d'une notification.
func Apercu(s string) string {
	return tronquer(strings.Join(strings.Fields(s), " "), 140)
}

var mois = []string{"janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"}
var joursSemaine = []string{"dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"}

// DateFr : « dimanche 12 octobre » à partir de AAAA-MM-JJ (la date telle quelle si elle n'est pas lisible).
func DateFr(iso string) string {
	t, err := time.Parse("2006-01-02", strings.TrimSpace(iso))
	if err != nil {
		return iso
	}
	return fmt.Sprintf("%s %d %s", joursSemaine[t.Weekday()], t.Day(), mois[t.Month()-1])
}
