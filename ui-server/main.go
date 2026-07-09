package main

import (
    "encoding/json"
    "flag"
    "log"
    "net/http"
    "strings"
    "sync"
    "time"
)

const POLL_INTERVAL = 5*time.Minute

type Entry struct {
    Name string `json:"name"`
    URL  string `json:"url"`
    SqlUrl string `json:"sqlUrl"`
    CpUrl string `json:"cpUrl"`
    // internal timestamp, omitted from JSON responses
    lastSeen time.Time `json:"-"`
}

type Server struct {
    allowed map[string]struct{}
    store   map[string]Entry
    mu      sync.RWMutex
}

func NewServer(allowed []string) *Server {
    a := make(map[string]struct{}, len(allowed))
    for _, u := range allowed {
        a[u] = struct{}{}
    }
    return &Server{
        allowed: a,
        store:   make(map[string]Entry),
    }
}

func (s *Server) isAllowed(unid string) bool {
    _, ok := s.allowed[unid]
    return ok
}

// PUT /<UNID>  body: {"name":"...", "url":"..."}
func (s *Server) putHandler(w http.ResponseWriter, r *http.Request) {
    unid := strings.TrimPrefix(r.URL.Path, "/")
    if !s.isAllowed(unid) {
        http.Error(w, "UNID not allowed", http.StatusForbidden)
        return
    }
    var e Entry
    if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
        http.Error(w, "invalid JSON", http.StatusBadRequest)
        return
    }
    e.lastSeen = time.Now()
    s.mu.Lock()
    s.store[unid + " " + e.URL] = e
    s.mu.Unlock()
    w.WriteHeader(http.StatusNoContent)
}

// GET /<UNID>  returns the stored entry as JSON
func (s *Server) getHandler(w http.ResponseWriter, r *http.Request) {
    unid := strings.TrimPrefix(r.URL.Path, "/")
    if !s.isAllowed(unid) {
        http.Error(w, "UNID not allowed", http.StatusForbidden)
        return
    }
    s.mu.RLock()
    e, ok := s.store[unid]
    s.mu.RUnlock()
    if !ok {
        http.Error(w, "entry not found", http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(e)
}

func loadInstanceConfigs(directoryUrls string, srv * Server) {
    if directoryUrls == "" {
        return
    }

    now := time.Now()

    // Evict stale entries
    srv.mu.Lock()
    for id, entry := range srv.store {
        if now.Sub(entry.lastSeen) > POLL_INTERVAL * 2 {
            delete(srv.store, id)
        }
    }
    srv.mu.Unlock()

    directoryUrlsList := strings.Split(directoryUrls, ",")
    for _, u := range directoryUrlsList {
        u = strings.TrimSpace(u)
        if u == "" {
            continue
        }
        resp, err := http.Get(u)
        if err != nil {
            log.Printf("failed to fetch %s: %v", u, err)
            continue
        }
        var entries []Entry
        if err := json.NewDecoder(resp.Body).Decode(&entries); err != nil {
            log.Printf("invalid JSON from %s: %v", u, err)
            resp.Body.Close()
            continue
        }
        resp.Body.Close()
        for _, e := range entries {
            urlParts := strings.Split(e.URL, "/")
            unid := urlParts[len(urlParts)-1]
            srv.mu.Lock()
            srv.store[unid + " " + e.URL] = Entry{Name: e.Name, URL: e.URL, SqlUrl: e.SqlUrl, CpUrl: e.CpUrl, lastSeen: now}
            srv.mu.Unlock()
        }
    }
}

func main() {
    // Allowed UNIDs (comma‑separated)
    var unids string
    flag.StringVar(&unids, "unids", "", "comma‑separated list of allowed UNIDs")

    // Configured ingress hosts (comma‑separated)
    var hosts string
    flag.StringVar(&hosts, "hosts", "", "comma‑separated list of ingress hosts")

    // Configured ingress hosts (comma‑separated)
    var pathPrefix string
    flag.StringVar(&pathPrefix, "pathPrefix", "", "WebUI path prefix")

    // Optional source URLs to pre‑load entries from (comma‑separated)
    var directoryUrls string
    flag.StringVar(&directoryUrls, "directoryUrls", "", "comma‑separated list of directory Urls")

    var port string
    flag.StringVar(&port, "port", "8081", "port to listen on")
    flag.Parse()

    if unids == "" {
        log.Fatal("no UNIDs provided; use -unids flag")
    }
    allowed := strings.Split(unids, ",")
    srv := NewServer(allowed)

    // ------------------------------------------------------------
    // Initial load from source URLs (if any) and keep list for refresh
    // ------------------------------------------------------------
    loadInstanceConfigs(directoryUrls, srv)

    // ------------------------------------------------------------
    // Background refresher: pull sources every 5 minutes,
    // update timestamps, and purge entries not refreshed in 10 minutes
    // ------------------------------------------------------------
    go func() {
        ticker := time.NewTicker(POLL_INTERVAL)
        defer ticker.Stop()
        for {
            <-ticker.C
            loadInstanceConfigs(directoryUrls, srv);
        }
    }()

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodPut:
            srv.putHandler(w, r)
        case http.MethodGet:
            srv.getHandler(w, r)
        default:
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        }
    })

    log.Printf("Server listening on :%s, allowed UNIDs: %v", port, allowed)
    if err := http.ListenAndServe(":"+port, nil); err != nil {
        log.Fatalf("listen error: %v", err)
    }
}