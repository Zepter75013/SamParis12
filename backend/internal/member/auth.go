package member

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"samparis12/backend/internal/httpx"
)

type contextKey string

const memberIDContextKey contextKey = "memberID"

type claims struct {
	MemberID int64 `json:"memberId"`
	IsBureau bool  `json:"isBureau"`
	jwt.RegisteredClaims
}

// AuthService émet et vérifie les jetons JWT de session pour l'espace adhérent.
type AuthService struct {
	secret []byte
}

func NewAuthService(secret string) *AuthService {
	return &AuthService{secret: []byte(secret)}
}

func (a *AuthService) IssueToken(memberID int64, isBureau bool) (string, error) {
	c := claims{
		MemberID: memberID,
		IsBureau: isBureau,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return token.SignedString(a.secret)
}

func (a *AuthService) parse(tokenString string) (*claims, error) {
	var c claims
	token, err := jwt.ParseWithClaims(tokenString, &c, func(t *jwt.Token) (any, error) {
		return a.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("jeton invalide")
	}
	return &c, nil
}

// RequireAuth protège un handler : exige un jeton "Authorization: Bearer <token>" valide.
func (a *AuthService) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok || token == "" {
			httpx.Error(w, http.StatusUnauthorized, "non authentifié")
			return
		}
		c, err := a.parse(token)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "session invalide ou expirée")
			return
		}
		ctx := context.WithValue(r.Context(), memberIDContextKey, c.MemberID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func MemberIDFromContext(ctx context.Context) (int64, bool) {
	id, ok := ctx.Value(memberIDContextKey).(int64)
	return id, ok
}

// generateCode produit un code numérique à 6 chiffres, envoyé par email.
func generateCode() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	n := (int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])) & 0x7fffffff
	return fmt.Sprintf("%06d", n%1000000)
}
