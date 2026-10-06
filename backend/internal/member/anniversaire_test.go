package member

import (
	"testing"
	"time"
)

func TestEstAnniversaire(t *testing.T) {
	cas := []struct {
		nom  string
		jour string
		now  time.Time
		want bool
	}{
		{"le jour même", "07-23", time.Date(2026, 7, 23, 12, 0, 0, 0, fuseauParis), true},
		{"la veille", "07-23", time.Date(2026, 7, 22, 12, 0, 0, 0, fuseauParis), false},
		{"le lendemain", "07-23", time.Date(2026, 7, 24, 12, 0, 0, 0, fuseauParis), false},
		// 22 juillet 23 h 30 UTC = 23 juillet 1 h 30 à Paris (heure d'été) : c'est déjà le jour J
		{"fuseau de Paris (UTC la veille)", "07-23", time.Date(2026, 7, 22, 23, 30, 0, 0, time.UTC), true},
		// 23 juillet 22 h 30 UTC = 24 juillet 0 h 30 à Paris : le jour J est terminé
		{"fuseau de Paris (UTC le jour même)", "07-23", time.Date(2026, 7, 23, 22, 30, 0, 0, time.UTC), false},
		{"29 février fêté le 28 en année non bissextile", "02-29", time.Date(2026, 2, 28, 12, 0, 0, 0, fuseauParis), true},
		{"29 février fêté le 29 en année bissextile", "02-29", time.Date(2028, 2, 29, 12, 0, 0, 0, fuseauParis), true},
		{"29 février pas le 28 en année bissextile", "02-29", time.Date(2028, 2, 28, 12, 0, 0, 0, fuseauParis), false},
	}
	for _, c := range cas {
		if got := estAnniversaire(c.jour, c.now); got != c.want {
			t.Errorf("%s : estAnniversaire(%q, %s) = %v, attendu %v", c.nom, c.jour, c.now.Format(time.RFC3339), got, c.want)
		}
	}
}
