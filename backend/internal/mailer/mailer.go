package mailer

import (
	"fmt"
	"log"
	"net/smtp"

	"samparis12/backend/internal/config"
)

type Mailer struct {
	cfg config.Config
}

func New(cfg config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

// SendCode envoie le code à usage unique (définition/réinitialisation de mot
// de passe) à l'adresse donnée. Si le SMTP n'est pas configuré (dev sans
// identifiants), le code est simplement journalisé côté serveur.
func (m *Mailer) SendCode(to, code string) error {
	if m.cfg.SMTPHost == "" || m.cfg.SMTPUsername == "" {
		log.Printf("mailer: SMTP non configuré, code pour %s : %s", to, code)
		return nil
	}

	subject := "SAM Paris 12 — Votre code de vérification"
	body := fmt.Sprintf(
		"Bonjour,\r\n\r\nVoici votre code de vérification pour définir votre mot de passe sur l'Espace Adhérent SAM Paris 12 :\r\n\r\n    %s\r\n\r\nCe code est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\r\n\r\nSAM Paris 12",
		code,
	)
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		m.cfg.SMTPFrom, to, subject, body)

	addr := m.cfg.SMTPHost + ":" + m.cfg.SMTPPort
	auth := smtp.PlainAuth("", m.cfg.SMTPUsername, m.cfg.SMTPPassword, m.cfg.SMTPHost)

	return smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{to}, []byte(msg))
}
