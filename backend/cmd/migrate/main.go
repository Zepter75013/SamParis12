// Applique les fichiers migrations/*.sql, dans l'ordre, à la base configurée
// par les variables d'environnement (mêmes que cmd/api). Idempotent tant que
// les migrations utilisent CREATE TABLE IF NOT EXISTS / INSERT IGNORE.
//
// Usage : go run ./cmd/migrate
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"

	"samparis12/backend/internal/config"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	dsn := fmt.Sprintf("%s&multiStatements=true", cfg.MySQLDSN())
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("open mysql: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("ping mysql: %v", err)
	}

	dir := "migrations"
	entries, err := os.ReadDir(dir)
	if err != nil {
		log.Fatalf("read migrations dir: %v", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".sql" {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		path := filepath.Join(dir, name)
		content, err := os.ReadFile(path)
		if err != nil {
			log.Fatalf("read %s: %v", path, err)
		}

		log.Printf("applying %s", name)
		if _, err := db.Exec(string(content)); err != nil {
			log.Fatalf("apply %s: %v", path, err)
		}
	}

	log.Println("migrations applied")
}
