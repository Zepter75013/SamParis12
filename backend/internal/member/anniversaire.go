package member

import (
	"regexp"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata" // fuseau Europe/Paris disponible même dans l'image Docker minimale
)

// Anniversaire dans le trombinoscope : un adhérent est fêté le jour de son anniversaire s'il a choisi de montrer sa date de
// naissance aux autres adhérents (champ libre « Je suis né » de ses informations visibles, par exemple « 23 juillet 1967 » ou
// « 23/07/1967 »). S'il ne l'a pas renseignée ou si elle n'est pas reconnue, il n'est pas fêté. Seul l'indicateur du jour est
// envoyé ; la date de naissance confidentielle n'intervient jamais.

var fuseauParis = func() *time.Location {
	if l, err := time.LoadLocation("Europe/Paris"); err == nil {
		return l
	}
	return time.Local
}()

// estAnniversaire : « MM-JJ » est-il le jour d'aujourd'hui à Paris ? Un 29 février est fêté le 28 février les années non bissextiles.
func estAnniversaire(mmjj string, maintenant time.Time) bool {
	j := maintenant.In(fuseauParis)
	if j.Format("01-02") == mmjj {
		return true
	}
	return mmjj == "02-29" && j.Format("01-02") == "02-28" && j.AddDate(0, 0, 1).Month() == time.March
}

var (
	reISO      = regexp.MustCompile(`(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})`)
	reTexte    = regexp.MustCompile(`(?:^|\D)(\d{1,2})\s*(?:er)?\s*(?:de\s+)?([a-z]{3,})`)
	reNumeric  = regexp.MustCompile(`(?:^|\D)(\d{1,2})\s*[/.\-]\s*(\d{1,2})(?:\s*[/.\-]\s*\d{2,4})?(?:\D|$)`)
	sansAccent = strings.NewReplacer("é", "e", "è", "e", "ê", "e", "ë", "e", "à", "a", "â", "a", "ä", "a", "î", "i", "ï", "i",
		"ô", "o", "ö", "o", "û", "u", "ù", "u", "ü", "u", "ç", "c")
)

// numeroMois : « juillet », « juil. », « Juil » → 7 ; 0 si ce n'est pas un mois.
func numeroMois(mot string) int {
	for prefixe, n := range map[string]int{"janv": 1, "fev": 2, "mar": 3, "avr": 4, "mai": 5, "juin": 6, "juil": 7, "aou": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12} {
		if strings.HasPrefix(mot, prefixe) {
			return n
		}
	}
	return 0
}

// jourAnniversaire extrait le jour et le mois d'un texte de date de naissance (l'année est facultative et ignorée) : « MM-JJ ».
func jourAnniversaire(texte string) (string, bool) {
	t := sansAccent.Replace(strings.ToLower(strings.TrimSpace(texte)))
	if t == "" {
		return "", false
	}
	var jour, mois int
	switch {
	case reISO.MatchString(t):
		m := reISO.FindStringSubmatch(t)
		mois, _ = strconv.Atoi(m[2])
		jour, _ = strconv.Atoi(m[3])
	default:
		for _, m := range reTexte.FindAllStringSubmatch(t, -1) {
			if n := numeroMois(m[2]); n > 0 {
				jour, _ = strconv.Atoi(m[1])
				mois = n
				break
			}
		}
		if mois == 0 {
			if m := reNumeric.FindStringSubmatch(t); m != nil {
				jour, _ = strconv.Atoi(m[1])
				mois, _ = strconv.Atoi(m[2])
			}
		}
	}
	if mois < 1 || mois > 12 || jour < 1 {
		return "", false
	}
	// jours possibles dans le mois (29 février accepté)
	if jour > time.Date(2024, time.Month(mois)+1, 0, 12, 0, 0, 0, time.UTC).Day() {
		return "", false
	}
	return time.Date(2024, time.Month(mois), jour, 12, 0, 0, 0, time.UTC).Format("01-02"), true
}

var moisFrancais = [...]string{"janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"}

var reAnnee = regexp.MustCompile(`\b(1[89]\d{2}|20\d{2})\b`)

// libelleNaissance : « 1967-07-23 » → « 23 juillet 1967 » (ou « 23 juillet » sans l'année).
func libelleNaissance(date time.Time, avecAnnee bool) string {
	s := strconv.Itoa(date.Day()) + " " + moisFrancais[date.Month()-1]
	if avecAnnee {
		s += " " + strconv.Itoa(date.Year())
	}
	return s
}

// naissanceVisibleSynchronisee garde la date de naissance affichée dans le trombinoscope (champ libre « Je suis né ») en phase
// avec la date de naissance confidentielle quand elle la reprenait. Elle renvoie le nouveau texte et si le champ doit changer :
//   - le champ visible est vide : l'adhérent ne montre pas sa date, on ne touche à rien ;
//   - il n'indique pas le même jour et le même mois que l'ancienne date confidentielle (texte personnel, date déjà différente),
//     ou une autre année : on ne touche à rien ;
//   - sinon il suivait la date confidentielle : il prend la nouvelle (avec l'année seulement s'il en affichait une) ; si la date
//     confidentielle est supprimée, le champ visible est vidé.
func naissanceVisibleSynchronisee(ancienne, nouvelle *string, visible string) (string, bool) {
	visible = strings.TrimSpace(visible)
	if visible == "" || ancienne == nil {
		return visible, false
	}
	avant, err := time.Parse("2006-01-02", *ancienne)
	if err != nil {
		return visible, false
	}
	if jour, ok := jourAnniversaire(visible); !ok || jour != avant.Format("01-02") {
		return visible, false
	}
	annee := reAnnee.FindString(visible)
	if annee != "" && annee != strconv.Itoa(avant.Year()) {
		return visible, false
	}
	if nouvelle == nil || strings.TrimSpace(*nouvelle) == "" {
		return "", true
	}
	apres, err := time.Parse("2006-01-02", strings.TrimSpace(*nouvelle))
	if err != nil {
		return visible, false
	}
	texte := libelleNaissance(apres, annee != "")
	return texte, texte != visible
}
