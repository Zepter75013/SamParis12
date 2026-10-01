package mailer

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/smtp"
	"strings"
	"time"

	"samparis12/backend/internal/config"
)

// messageID génère un Message-Id conforme (RFC 5322). Son absence, tout comme
// celle de l'en-tête Date, est un signal de spam fort pour les filtres
// stricts (Free.fr notamment), alors que Gmail s'en accommode très bien.
func messageID(domain string) string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	if domain == "" {
		domain = "samparis12.org"
	}
	return fmt.Sprintf("<%d.%s@%s>", time.Now().UnixNano(), hex.EncodeToString(buf), domain)
}

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
	subject := "SAM Paris 12 — Votre code de vérification"
	textBody := fmt.Sprintf(
		"Bonjour,\r\n\r\nVoici votre code de vérification pour définir votre mot de passe sur l'Espace Adhérent SAM Paris 12 :\r\n\r\n    %s\r\n\r\nCe code est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\r\n\r\nSAM Paris 12",
		code,
	)
	htmlBody := fmt.Sprintf(codeHTMLTemplate, code)

	if m.cfg.SMTPHost == "" || m.cfg.SMTPUsername == "" {
		log.Printf("mailer: SMTP non configuré, code pour %s : %s", to, code)
		return nil
	}

	msg := buildAlternativeMessage(m.cfg.SMTPFrom, to, subject, textBody, htmlBody)

	addr := m.cfg.SMTPHost + ":" + m.cfg.SMTPPort
	auth := smtp.PlainAuth("", m.cfg.SMTPUsername, m.cfg.SMTPPassword, m.cfg.SMTPHost)

	return smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{to}, msg)
}

// SendWelcome envoie à un nouvel adhérent (créé par le bureau) l'email de
// bienvenue l'informant que son compte existe et comment définir son mot de
// passe (via "Mot de passe oublié ?" sur la page de connexion).
func (m *Mailer) SendWelcome(to, prenom, loginURL string) error {
	subject := "Bienvenue au SAM Paris 12 — ton compte adhérent est prêt"

	textBody := fmt.Sprintf(
		"Bonjour %s,\r\n\r\nTon compte sur l'espace adhérent du SAM Paris 12 vient d'être créé par le bureau du club.\r\n\r\nPour y accéder, rends-toi sur %s puis clique sur « Mot de passe oublié ? » : tu recevras un code par email te permettant de définir ton propre mot de passe.\r\n\r\nÀ bientôt sur les chemins !\r\nSAM Paris 12",
		prenom, loginURL,
	)

	htmlBody := fmt.Sprintf(welcomeHTMLTemplate, prenom, loginURL, loginURL, loginURL)

	if m.cfg.SMTPHost == "" || m.cfg.SMTPUsername == "" {
		log.Printf("mailer: SMTP non configuré, email de bienvenue pour %s (%s) — lien : %s", to, prenom, loginURL)
		return nil
	}

	msg := buildAlternativeMessage(m.cfg.SMTPFrom, to, subject, textBody, htmlBody)

	addr := m.cfg.SMTPHost + ":" + m.cfg.SMTPPort
	auth := smtp.PlainAuth("", m.cfg.SMTPUsername, m.cfg.SMTPPassword, m.cfg.SMTPHost)

	return smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{to}, msg)
}

// buildAlternativeMessage construit un message multipart/alternative
// (texte brut + HTML) pour les emails où une mise en forme compte.
func buildAlternativeMessage(from, to, subject, textBody, htmlBody string) []byte {
	const boundary = "samparis12-boundary-7f3a9c"
	var b strings.Builder

	fmt.Fprintf(&b, "From: %s\r\n", from)
	fmt.Fprintf(&b, "To: %s\r\n", to)
	fmt.Fprintf(&b, "Subject: %s\r\n", subject)
	fmt.Fprintf(&b, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(&b, "Message-Id: %s\r\n", messageID(""))
	fmt.Fprintf(&b, "MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=\"%s\"\r\n\r\n", boundary)

	fmt.Fprintf(&b, "--%s\r\n", boundary)
	fmt.Fprintf(&b, "Content-Type: text/plain; charset=UTF-8\r\n\r\n")
	b.WriteString(textBody)
	b.WriteString("\r\n\r\n")

	fmt.Fprintf(&b, "--%s\r\n", boundary)
	fmt.Fprintf(&b, "Content-Type: text/html; charset=UTF-8\r\n\r\n")
	b.WriteString(htmlBody)
	b.WriteString("\r\n\r\n")

	fmt.Fprintf(&b, "--%s--\r\n", boundary)
	return []byte(b.String())
}

// codeHTMLTemplate reprend la charte du site (même bandeau et mise en page
// que welcomeHTMLTemplate) — à usage avec fmt.Sprintf et un seul paramètre,
// le code.
const codeHTMLTemplate = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#EEEBE6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#EEEBE6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FBFAF9;border:1px solid #DEDAD3;max-width:480px;width:100%%;">
          <tr>
            <td style="background:#DE3327;padding:28px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">SAM Paris 12</span>
              <div style="color:#ffffff;opacity:0.85;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Club d'athlétisme &middot; Espace adhérent</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#1C1917;text-transform:uppercase;">Ton code de vérification</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A4441;">
                Voici le code à saisir sur l'espace adhérent du SAM Paris 12 pour définir ton mot de passe&nbsp;:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%%">
                <tr>
                  <td align="center" style="background:#EEEBE6;border:1px solid #DEDAD3;padding:18px;">
                    <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#DE3327;font-family:'Courier New',monospace;">%s</span>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#877D75;">
                Ce code est valable 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #DEDAD3;">
              <p style="margin:0;font-size:11px;color:#877D75;text-transform:uppercase;letter-spacing:0.5px;">
                SAM Paris 12 &middot; Club d'athlétisme hors stade &middot; Paris 12e
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

// welcomeHTMLTemplate reprend la charte du site (bandeau vermillon, typo
// condensée majuscule, bouton plein sans arrondi) — à usage avec fmt.Sprintf
// et, dans l'ordre : prénom, lien (bouton), lien (texte), lien (href texte).
const welcomeHTMLTemplate = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#EEEBE6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#EEEBE6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FBFAF9;border:1px solid #DEDAD3;max-width:480px;width:100%%;">
          <tr>
            <td style="background:#DE3327;padding:28px 32px;">
              <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">SAM Paris 12</span>
              <div style="color:#ffffff;opacity:0.85;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Club d'athlétisme &middot; Espace adhérent</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#1C1917;text-transform:uppercase;">Bienvenue, %s !</h1>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4A4441;">
                Ton compte sur l'espace adhérent du SAM Paris 12 vient d'être créé par le bureau du club.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4A4441;">
                Pour y accéder, clique sur le bouton ci-dessous puis sur &laquo; Mot de passe oublié&nbsp;? &raquo; : tu recevras un code par email te permettant de définir ton propre mot de passe.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#DE3327;">
                    <a href="%s" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Accéder à l'espace adhérent &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#877D75;">
                Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur&nbsp;:<br>
                <a href="%s" style="color:#DE3327;">%s</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #DEDAD3;">
              <p style="margin:0;font-size:11px;color:#877D75;text-transform:uppercase;letter-spacing:0.5px;">
                SAM Paris 12 &middot; Club d'athlétisme hors stade &middot; Paris 12e
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
