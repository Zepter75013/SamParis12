package mailer

import (
	"fmt"
	"html"
	"log"
	"net/smtp"
	"strings"
)

// NotifItem : un élément non vu, rappelé par e-mail (nouveau message, nouvelle course, rappel, document).
type NotifItem struct {
	Titre string
	Corps string
	URL   string
}

// SendNotifications envoie à un adhérent le récapitulatif de ce qu'il n'a pas vu sur l'espace adhérent, avec un lien
// vers chaque élément et vers le réglage de ses notifications. Sans SMTP configuré, l'envoi est seulement journalisé.
func (m *Mailer) SendNotifications(to, prenom string, items []NotifItem, profilURL string) error {
	if len(items) == 0 {
		return nil
	}
	subject := "SAM Paris 12 — " + items[0].Titre
	if len(items) > 1 {
		subject = fmt.Sprintf("SAM Paris 12 — %d nouveautés sur l'espace adhérent", len(items))
	}

	var txt, lignes strings.Builder
	fmt.Fprintf(&txt, "Bonjour %s,\r\n\r\nDu nouveau sur l'espace adhérent du SAM Paris 12 :\r\n\r\n", prenom)
	for _, it := range items {
		fmt.Fprintf(&txt, "- %s\r\n  %s\r\n  %s\r\n\r\n", it.Titre, it.Corps, it.URL)
		fmt.Fprintf(&lignes, notifItemHTML, html.EscapeString(it.URL), html.EscapeString(it.Titre), html.EscapeString(it.Corps), html.EscapeString(it.URL))
	}
	fmt.Fprintf(&txt, "Pour choisir ce que tu reçois (e-mail, notifications sur ton téléphone) : %s\r\n\r\nSAM Paris 12", profilURL)
	htmlBody := fmt.Sprintf(notifHTMLTemplate, html.EscapeString(prenom), lignes.String(), html.EscapeString(profilURL))

	if m.cfg.SMTPHost == "" || m.cfg.SMTPUsername == "" {
		log.Printf("mailer: SMTP non configuré, notification pour %s : %s", to, subject)
		return nil
	}
	msg := buildAlternativeMessage(m.cfg.SMTPFrom, to, subject, txt.String(), htmlBody)
	addr := m.cfg.SMTPHost + ":" + m.cfg.SMTPPort
	auth := smtp.PlainAuth("", m.cfg.SMTPUsername, m.cfg.SMTPPassword, m.cfg.SMTPHost)
	return smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{to}, msg)
}

// notifItemHTML : lien, titre, texte, lien — un élément du récapitulatif.
const notifItemHTML = `<tr><td style="padding:14px 16px;border:1px solid #DEDAD3;border-left:4px solid #DE3327;background:#ffffff;">
  <a href="%s" style="text-decoration:none;color:#1C1917;font-size:15px;font-weight:bold;">%s</a>
  <div style="margin-top:4px;font-size:13px;line-height:1.5;color:#4A4441;">%s</div>
  <a href="%s" style="display:inline-block;margin-top:8px;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#DE3327;text-decoration:none;">Voir &rarr;</a>
</td></tr><tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>`

// notifHTMLTemplate reprend la charte des autres e-mails du club — dans l'ordre : prénom, éléments, lien des réglages.
const notifHTMLTemplate = `<!DOCTYPE html>
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
              <h1 style="margin:0 0 16px;font-size:20px;color:#1C1917;text-transform:uppercase;">Du nouveau pour toi</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4A4441;">Bonjour %s, voici ce que tu n'as pas encore vu sur l'espace adhérent&nbsp;:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%%">%s</table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#877D75;">
                Tu reçois cet e-mail parce que ces éléments n'ont pas été vus dans l'heure. Pour choisir ce que tu reçois (e-mail, notifications sur ton téléphone)&nbsp;: <a href="%s" style="color:#DE3327;">mes notifications</a>.
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
