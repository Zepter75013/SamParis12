package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/joho/godotenv"

	"samparis12/backend/internal/config"
	"samparis12/backend/internal/db"
	"samparis12/backend/internal/httpapi"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	conn, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer conn.Close()

	checkSchema(conn)

	router := httpapi.NewRouter(conn, cfg)

	log.Printf("SAM Paris 12 API listening on :%s", cfg.AppPort)
	if err := http.ListenAndServe(":"+cfg.AppPort, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// checkSchema signale au démarrage les migrations oubliées : sans elles, certaines pages répondent « erreur serveur ».
// Elle ne bloque pas le démarrage.
func checkSchema(conn *sql.DB) {
	columns := [][3]string{
		{"members", "droit_creer_salons", "0018_chat.sql"},
		{"chat_messages", "edited_at", "0019_chat_edit.sql"},
		{"chat_room_prefs", "archived", "0020_chat_prefs.sql"},
		{"members", "sexe", "0021_member_sexe.sql"},
		{"game_scores", "best_meters", "0017_game_scores.sql"},
	}
	for _, c := range columns {
		var n int
		err := conn.QueryRow(`SELECT COUNT(*) FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, c[0], c[1]).Scan(&n)
		if err == nil && n == 0 {
			log.Printf("ATTENTION : migration manquante, %s.%s est absente (appliquer backend/migrations/%s)", c[0], c[1], c[2])
		}
	}
}
