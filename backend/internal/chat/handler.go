package chat

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"samparis12/backend/internal/httpx"
	"samparis12/backend/internal/member"
)

// Hub diffuse les événements en temps réel aux adhérents connectés (une seule instance de l'API : en mémoire).
type Hub struct {
	mu   sync.Mutex
	subs map[int64]map[chan []byte]struct{}
}

func NewHub() *Hub { return &Hub{subs: map[int64]map[chan []byte]struct{}{}} }

func (h *Hub) subscribe(id int64) (chan []byte, func()) {
	ch := make(chan []byte, 32)
	h.mu.Lock()
	if h.subs[id] == nil {
		h.subs[id] = map[chan []byte]struct{}{}
	}
	h.subs[id][ch] = struct{}{}
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.subs[id], ch)
		if len(h.subs[id]) == 0 {
			delete(h.subs, id)
		}
		h.mu.Unlock()
	}
}

func (h *Hub) publish(ids []int64, event string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	frame := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event, data))
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, id := range ids {
		for ch := range h.subs[id] {
			select {
			case ch <- frame:
			default: // client trop lent : il se resynchronisera à la reconnexion
			}
		}
	}
}

type Handler struct {
	repo *Repository
	hub  *Hub
}

func NewHandler(repo *Repository) *Handler { return &Handler{repo: repo, hub: NewHub()} }

func (h *Handler) me(w http.ResponseWriter, r *http.Request) *Person {
	id, _ := member.MemberIDFromContext(r.Context())
	p, err := h.repo.Person(id)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "session invalide")
		return nil
	}
	return p
}

func (h *Handler) fail(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrForbidden):
		httpx.Error(w, http.StatusForbidden, "accès refusé")
	case errors.Is(err, ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "introuvable")
	default:
		httpx.Error(w, http.StatusInternalServerError, "erreur serveur")
	}
}

func pathID(r *http.Request, name string) int64 {
	n, _ := strconv.ParseInt(r.PathValue(name), 10, 64)
	return n
}

func (h *Handler) room(w http.ResponseWriter, r *http.Request, p *Person) *roomRow {
	rr, err := h.repo.Access(pathID(r, "id"), p)
	if err != nil {
		h.fail(w, err)
		return nil
	}
	return rr
}

// Stream : flux d'événements (messages, lectures, suppressions, nouveaux salons) pour l'adhérent connecté.
func (h *Handler) Stream(w http.ResponseWriter, r *http.Request) {
	id, _ := member.MemberIDFromContext(r.Context())
	flusher, ok := w.(http.Flusher)
	if !ok {
		httpx.Error(w, http.StatusInternalServerError, "flux non supporté")
		return
	}
	rc := http.NewResponseController(w)
	_ = rc.SetWriteDeadline(time.Time{})

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	fmt.Fprint(w, "retry: 3000\n\n: connecté\n\n")
	flusher.Flush()

	ch, cancel := h.hub.subscribe(id)
	defer cancel()
	tick := time.NewTicker(25 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case frame := <-ch:
			if _, err := w.Write(frame); err != nil {
				return
			}
			flusher.Flush()
		case <-tick.C:
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

type roomsResponse struct {
	Rooms     []Room `json:"rooms"`
	CanCreate bool   `json:"canCreate"`
}

func (h *Handler) Rooms(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	rooms, err := h.repo.Rooms(p)
	if err != nil {
		h.fail(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, roomsResponse{Rooms: rooms, CanCreate: p.CanCreate})
}

type messagesResponse struct {
	Messages     []Message     `json:"messages"`
	Participants []Participant `json:"participants"`
	OtherRead    int64         `json:"otherRead"`
	More         bool          `json:"more"`
}

func (h *Handler) Messages(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	rr := h.room(w, r, p)
	if rr == nil {
		return
	}
	before, _ := strconv.ParseInt(r.URL.Query().Get("before"), 10, 64)
	msgs, err := h.repo.Messages(rr.id, before)
	if err != nil {
		h.fail(w, err)
		return
	}
	resp := messagesResponse{Messages: msgs, More: len(msgs) == pageSize}
	if resp.Messages == nil {
		resp.Messages = []Message{}
	}
	if before == 0 {
		if resp.Participants, err = h.repo.Participants(rr); err != nil {
			h.fail(w, err)
			return
		}
		if rr.kind == "dm" {
			resp.OtherRead = h.repo.OtherRead(rr.id, p.ID)
		}
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) Send(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	rr := h.room(w, r, p)
	if rr == nil {
		return
	}
	var in struct {
		Texte   string `json:"texte"`
		ReplyTo int64  `json:"replyTo"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	msg, err := h.repo.AddMessage(rr.id, p.ID, in.Texte, in.ReplyTo)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	if ids, err := h.repo.MemberIDs(rr); err == nil {
		h.hub.publish(ids, "message", map[string]any{"roomId": rr.id, "message": msg})
	}
	httpx.JSON(w, http.StatusCreated, msg)
}

func (h *Handler) Read(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	rr := h.room(w, r, p)
	if rr == nil {
		return
	}
	var in struct {
		UpTo int64 `json:"upTo"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&in); err != nil || in.UpTo <= 0 {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if err := h.repo.MarkRead(rr.id, p.ID, in.UpTo); err != nil {
		h.fail(w, err)
		return
	}
	if rr.kind == "dm" {
		if ids, err := h.repo.MemberIDs(rr); err == nil {
			h.hub.publish(ids, "read", map[string]any{"roomId": rr.id, "memberId": p.ID, "upTo": in.UpTo})
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	msg, err := h.repo.Message(pathID(r, "id"))
	if err != nil {
		h.fail(w, err)
		return
	}
	rr, err := h.repo.Access(msg.RoomID, p)
	if err != nil {
		h.fail(w, err)
		return
	}
	if _, err := h.repo.DeleteMessage(msg.ID, p); err != nil {
		h.fail(w, err)
		return
	}
	if ids, err := h.repo.MemberIDs(rr); err == nil {
		h.hub.publish(ids, "delete", map[string]any{"roomId": rr.id, "messageId": msg.ID})
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) OpenDM(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	var in struct {
		MemberID int64 `json:"memberId"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	id, err := h.repo.OpenDM(p.ID, in.MemberID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]int64{"roomId": id})
}

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	if !p.CanCreate {
		httpx.Error(w, http.StatusForbidden, "tu n'as pas le droit de créer un salon")
		return
	}
	var in struct {
		Nom       string  `json:"nom"`
		MemberIDs []int64 `json:"memberIds"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	id, err := h.repo.CreateRoom(in.Nom, p.ID, in.MemberIDs)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	h.hub.publish(append([]int64{p.ID}, in.MemberIDs...), "rooms", map[string]int64{"roomId": id})
	httpx.JSON(w, http.StatusCreated, map[string]int64{"roomId": id})
}

func (h *Handler) AddMembers(w http.ResponseWriter, r *http.Request) {
	p := h.me(w, r)
	if p == nil {
		return
	}
	rr := h.room(w, r, p)
	if rr == nil {
		return
	}
	if rr.kind != "custom" || (!p.IsSuper && rr.createdBy != p.ID) {
		httpx.Error(w, http.StatusForbidden, "seul le créateur du salon peut ajouter des participants")
		return
	}
	var in struct {
		MemberIDs []int64 `json:"memberIds"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&in); err != nil || len(in.MemberIDs) == 0 || len(in.MemberIDs) > maxMembers {
		httpx.Error(w, http.StatusBadRequest, "requête invalide")
		return
	}
	if err := h.repo.AddMembers(rr.id, in.MemberIDs); err != nil {
		h.fail(w, err)
		return
	}
	h.hub.publish(in.MemberIDs, "rooms", map[string]int64{"roomId": rr.id})
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
