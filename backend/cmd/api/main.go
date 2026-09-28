package main

import (
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

	router := httpapi.NewRouter(conn, cfg)

	log.Printf("SAM Paris 12 API listening on :%s", cfg.AppPort)
	if err := http.ListenAndServe(":"+cfg.AppPort, router); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
