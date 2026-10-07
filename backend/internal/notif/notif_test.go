package notif

// Tests d'intégration : ils utilisent une base MySQL de test (toutes les migrations appliquées, adhérent n° 1 présent),
// désignée par NOTIF_TEST_DSN (ex. samtest:samtest@tcp(127.0.0.1:33062)/samtest?parseTime=true). Sans elle, ils sont ignorés.

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/hkdf"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	_ "github.com/go-sql-driver/mysql"

	"samparis12/backend/internal/config"
)

func baseDeTest(t *testing.T) *sql.DB {
	dsn := os.Getenv("NOTIF_TEST_DSN")
	if dsn == "" {
		t.Skip("NOTIF_TEST_DSN non défini : test d'intégration ignoré")
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil || db.Ping() != nil {
		t.Fatalf("base de test injoignable : %v", err)
	}
	return db
}

// dechiffrer : déchiffrement aes128gcm (RFC 8188 / 8291), comme le ferait le navigateur de l'adhérent.
func dechiffrer(t *testing.T, corps []byte, prive *ecdh.PrivateKey, secret []byte) []byte {
	sel, idlen := corps[:16], int(corps[20])
	serveur, err := ecdh.P256().NewPublicKey(corps[21 : 21+idlen])
	if err != nil {
		t.Fatalf("clé du serveur : %v", err)
	}
	chiffre := corps[21+idlen:]
	partage, _ := prive.ECDH(serveur)
	prkCle, _ := hkdf.Extract(sha256.New, partage, secret)
	info := append([]byte("WebPush: info\x00"), append(prive.PublicKey().Bytes(), serveur.Bytes()...)...)
	ikm, _ := hkdf.Expand(sha256.New, prkCle, string(info), 32)
	prk, _ := hkdf.Extract(sha256.New, ikm, sel)
	cek, _ := hkdf.Expand(sha256.New, prk, "Content-Encoding: aes128gcm\x00", 16)
	nonce, _ := hkdf.Expand(sha256.New, prk, "Content-Encoding: nonce\x00", 12)
	bloc, _ := aes.NewCipher(cek)
	gcm, _ := cipher.NewGCM(bloc)
	clair, err := gcm.Open(nil, nonce, chiffre, nil)
	if err != nil {
		t.Fatalf("déchiffrement : %v", err)
	}
	clair = []byte(strings.TrimRight(string(clair), "\x00"))
	if len(clair) == 0 || clair[len(clair)-1] != 2 {
		t.Fatalf("délimiteur de fin absent")
	}
	return clair[:len(clair)-1]
}

func TestPushChiffreSigneEtOubliAbonnementExpire(t *testing.T) {
	db := baseDeTest(t)
	privVapid, pubVapid, _ := webpush.GenerateVAPIDKeys()
	prive, _ := ecdh.P256().GenerateKey(rand.Reader)
	secret := make([]byte, 16)
	rand.Read(secret)

	var recu []byte
	var autorisation string
	statut := http.StatusCreated
	push := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recu, _ = io.ReadAll(r.Body)
		autorisation = r.Header.Get("Authorization")
		w.WriteHeader(statut)
	}))
	defer push.Close()

	endpoint := push.URL + "/abonnement-de-test"
	b64 := base64.RawURLEncoding.EncodeToString
	db.Exec(`DELETE FROM push_subscriptions WHERE endpoint_hash = ?`, empreinte(endpoint))
	if _, err := db.Exec(`INSERT INTO push_subscriptions (member_id, endpoint_hash, endpoint, p256dh, auth) VALUES (1, ?, ?, ?, ?)`,
		empreinte(endpoint), endpoint, b64(prive.PublicKey().Bytes()), b64(secret)); err != nil {
		t.Fatalf("abonnement : %v", err)
	}

	s := New(db, config.Config{VAPIDPublicKey: pubVapid, VAPIDPrivateKey: privVapid, VAPIDSubject: "mailto:contact@samparis12.org"}, nil)
	s.client = push.Client()
	envoi := Payload{Titre: "Laurent ATTAL", Corps: "Rendez-vous à 18h30 au stade Léo Lagrange", URL: "/espace-adherent/tableau-de-bord?onglet=chat&salon=5", Tag: "message-5"}
	if n := s.pousser(1, envoi); n != 1 {
		t.Fatalf("appareils atteints = %d, attendu 1", n)
	}
	if !strings.HasPrefix(autorisation, "vapid t=") || !strings.Contains(autorisation, "k="+pubVapid) {
		t.Fatalf("signature VAPID absente ou fausse : %q", autorisation)
	}
	var lu Payload
	if err := json.Unmarshal(dechiffrer(t, recu, prive, secret), &lu); err != nil || lu != envoi {
		t.Fatalf("contenu déchiffré = %+v (%v), attendu %+v", lu, err, envoi)
	}

	statut = http.StatusGone // l'adhérent a retiré l'autorisation : l'abonnement doit être oublié
	if n := s.pousser(1, envoi); n != 0 {
		t.Fatalf("appareils atteints = %d, attendu 0", n)
	}
	var reste int
	db.QueryRow(`SELECT COUNT(*) FROM push_subscriptions WHERE endpoint_hash = ?`, empreinte(endpoint)).Scan(&reste)
	if reste != 0 {
		t.Fatalf("l'abonnement expiré n'a pas été supprimé")
	}
}

func TestRappelVeilleUneSeuleFois(t *testing.T) {
	db := baseDeTest(t)
	s := New(db, config.Config{}, nil)
	paris := s.paris
	soir := time.Date(2030, 6, 1, 19, 0, 0, 0, paris) // samedi 1er juin 2030, 19 h : rappel des courses du dimanche 2
	matin := time.Date(2030, 6, 1, 9, 0, 0, 0, paris)

	res, err := db.Exec(`INSERT INTO races (titre, race_date, lieu, type, distance_km, description, site_internet, created_by) VALUES ('Course de test des rappels', '2030-06-02', 'Vincennes', 'Route', 10, '', '', 1)`)
	if err != nil {
		t.Fatalf("course : %v", err)
	}
	course, _ := res.LastInsertId()
	defer db.Exec(`DELETE FROM notifications WHERE kind = 'rappel' AND ref_id = ?`, course)
	defer db.Exec(`DELETE FROM races WHERE id = ?`, course)
	db.Exec(`INSERT INTO race_registrations (race_id, member_id) VALUES (?, 1)`, course)

	compter := func() (n int) {
		db.QueryRow(`SELECT COUNT(*) FROM notifications WHERE kind = 'rappel' AND ref_id = ? AND member_id = 1`, course).Scan(&n)
		return
	}
	s.horloge = func() time.Time { return matin }
	s.rappelsVeille()
	if compter() != 0 {
		t.Fatalf("rappel envoyé avant 18 h")
	}
	s.horloge = func() time.Time { return soir }
	s.rappelsVeille()
	if compter() != 1 {
		t.Fatalf("rappel absent à 19 h")
	}
	s.rappels = "" // même après un redémarrage de l'API dans la soirée : pas de second rappel
	s.rappelsVeille()
	if compter() != 1 {
		t.Fatalf("rappel envoyé deux fois")
	}
	var titre string
	db.QueryRow(`SELECT titre FROM notifications WHERE kind = 'rappel' AND ref_id = ?`, course).Scan(&titre)
	if titre != "Rappel : Course de test des rappels" {
		t.Fatalf("titre du rappel = %q", titre)
	}
}

func TestDateFr(t *testing.T) {
	if got := DateFr("2026-10-08"); got != "jeudi 8 octobre" {
		t.Fatalf("DateFr = %q", got)
	}
}
