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

func TestJourAnniversaire(t *testing.T) {
	cas := []struct {
		texte string
		want  string // « MM-JJ », ou vide si non reconnu
	}{
		{"23 Juillet 1967", "07-23"},
		{"23 juillet", "07-23"},
		{"1er janvier 1980", "01-01"},
		{"1 Janv. 1980", "01-01"},
		{"23/07/1967", "07-23"},
		{"23-07-67", "07-23"},
		{"23.07", "07-23"},
		{"Né le 5 mars", "03-05"},
		{"5 mars 1985 à Paris", "03-05"},
		{"le 12 février", "02-12"},
		{"14 décembre 1990", "12-14"},
		{"3 aout", "08-03"},
		{"3 août 1971", "08-03"},
		{"29 février 1980", "02-29"},
		{"1967-07-23", "07-23"},
		{"2 SEPT 1999", "09-02"},
		{"", ""},
		{"1967", ""},
		{"juillet 1967", ""},
		{"31 avril 1980", ""},
		{"31/02/1980", ""},
		{"12/13/1980", ""},
		{"inconnu", ""},
	}
	for _, c := range cas {
		got, ok := jourAnniversaire(c.texte)
		if c.want == "" {
			if ok {
				t.Errorf("jourAnniversaire(%q) = %q, attendu : non reconnu", c.texte, got)
			}
			continue
		}
		if !ok || got != c.want {
			t.Errorf("jourAnniversaire(%q) = (%q, %v), attendu %q", c.texte, got, ok, c.want)
		}
	}
}

func TestNaissanceVisibleSynchronisee(t *testing.T) {
	p := func(s string) *string { return &s }
	cas := []struct {
		nom        string
		ancienne   *string
		nouvelle   *string
		visible    string
		want       string
		wantChange bool
	}{
		{"suit la nouvelle date, avec l'année", p("1967-07-23"), p("1967-07-24"), "23 juillet 1967", "24 juillet 1967", true},
		{"suit une date au format numérique", p("1967-07-23"), p("1968-08-01"), "23/07/1967", "1 août 1968", true},
		{"sans année : l'année reste privée", p("1967-07-23"), p("1970-09-05"), "23 juillet", "5 septembre", true},
		{"date supprimée : le champ est vidé", p("1967-07-23"), nil, "23 juillet 1967", "", true},
		{"date supprimée (chaîne vide)", p("1967-07-23"), p(""), "23 juillet 1967", "", true},
		{"champ vide : l'adhérent ne montre pas sa date", p("1967-07-23"), p("1968-01-01"), "", "", false},
		{"pas d'ancienne date : rien à comparer", nil, p("1968-01-01"), "12 mars 1970", "12 mars 1970", false},
		{"texte personnel sur un autre jour", p("1967-07-23"), p("1968-01-01"), "12 mars 1970", "12 mars 1970", false},
		{"même jour mais autre année : pas synchronisé", p("1967-07-23"), p("1968-01-01"), "23 juillet 1971", "23 juillet 1971", false},
		{"nouvelle date identique : rien à changer", p("1967-07-23"), p("1967-07-23"), "23 juillet 1967", "23 juillet 1967", false},
		{"texte non reconnu : on ne touche à rien", p("1967-07-23"), p("1968-01-01"), "né en été", "né en été", false},
	}
	for _, c := range cas {
		got, change := naissanceVisibleSynchronisee(c.ancienne, c.nouvelle, c.visible)
		if got != c.want || change != c.wantChange {
			t.Errorf("%s : (%q, %v), attendu (%q, %v)", c.nom, got, change, c.want, c.wantChange)
		}
	}
}
