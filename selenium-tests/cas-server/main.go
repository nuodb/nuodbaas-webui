// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

package main

import (
  "crypto/rand"
  "encoding/hex"
  "fmt"
  "html/template"
  "log"
  "net/http"
  "net/url"
  "os"
  "sync"
  "strings"
)

type ticketInfo struct {
  username string
  service  string
}

type Server struct {
  mu      sync.Mutex
  tickets map[string]ticketInfo // ticket -> info
}

func newServer() *Server {
  return &Server{tickets: make(map[string]ticketInfo)}
}

func generateTicket() string {
  b := make([]byte, 8)
  _, err := rand.Read(b)
  if err != nil {
    return "ST-000000"
  }
  return "ST-" + hex.EncodeToString(b)
}

var loginTmpl = template.Must(template.New("login").Parse(`
<html><body>
<h2>CAS Login</h2>
<form method="post" action="/cas-server/login">
  <input type="hidden" name="service" value="{{.Service}}" />
  <label>Username: <input name="username" /></label><br/>
  <label>Password: <input type="password" name="password" /></label><br/>
  <button id="login-button" type="submit">Login</button>
  </form>
</body></html>
`))

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
  switch r.Method {
  case http.MethodGet:
    service := r.URL.Query().Get("service")
    _ = loginTmpl.Execute(w, map[string]string{"Service": service})
    return
  case http.MethodPost:
    if err := r.ParseForm(); err != nil {
      http.Error(w, "bad request", http.StatusBadRequest)
      return
    }
    username := r.FormValue("username")
    password := r.FormValue("password")
    service := r.FormValue("service")

    // fail on missing username/password
    if username == "" || password == "" {
      http.Error(w, "username/password required", http.StatusUnauthorized)
      return
    }

    // accept all username/passwords except if they contain "invalid"
    if strings.Contains(username, "invalid") || strings.Contains(password, "invalid") {
      http.Error(w, "invalid username/password", http.StatusUnauthorized)
      return
    }

    ticket := generateTicket()
    s.mu.Lock()
    s.tickets[ticket] = ticketInfo{username: username, service: service}
    s.mu.Unlock()
    if service != "" {
      // attach ticket to service URL
      u, err := url.Parse(service)
      if err != nil {
        http.Error(w, "invalid service url", http.StatusBadRequest)
        return
      }
      q := u.Query()
      q.Set("ticket", ticket)
      u.RawQuery = q.Encode()
      http.Redirect(w, r, u.String(), http.StatusFound)
      return
    }
    fmt.Fprintf(w, "Logged in. Ticket: %s\n", ticket)
    return
  default:
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
  }
}

// validate implements a simple CAS v1 style validate endpoint
// Response: two lines: "yes"/"no" then username or blank
func (s *Server) handleValidate(w http.ResponseWriter, r *http.Request) {
  ticket := r.URL.Query().Get("ticket")
  s.mu.Lock()
  info, ok := s.tickets[ticket]
  s.mu.Unlock()
  if ok {
    fmt.Fprintln(w, "yes")
    fmt.Fprintln(w, info.username)
  } else {
    fmt.Fprintln(w, "no")
    fmt.Fprintln(w, "")
  }
}

// /serviceValidate implements a simple CAS v2-style XML serviceValidate response
func (s *Server) handleServiceValidate(w http.ResponseWriter, r *http.Request) {
  ticket := r.URL.Query().Get("ticket")
  service := r.URL.Query().Get("service")
  s.mu.Lock()
  info, ok := s.tickets[ticket]
  s.mu.Unlock()
  w.Header().Set("Content-Type", "application/xml; charset=utf-8")
  fmt.Fprintln(w, `<?xml version="1.0" encoding="UTF-8"?>`)
  fmt.Fprintln(w, `<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas">`)
  if ok {
    // optional: verify service matches if ticket was issued for a service
    if info.service != "" && service != "" && strings.HasPrefix(info.service, service) == false {
      log.Printf(info.service + " - " + service);
      fmt.Fprintf(w, "  <cas:authenticationFailure code=\"INVALID_SERVICE\">Ticket service mismatch</cas:authenticationFailure>\n")
    } else {
      fmt.Fprintln(w, "  <cas:authenticationSuccess>")
      fmt.Fprintf(w, "    <cas:user>%s</cas:user>\n", template.HTMLEscapeString(info.username))
      fmt.Fprintln(w, "  </cas:authenticationSuccess>")
    }
  } else {
    fmt.Fprintln(w, "  <cas:authenticationFailure code=\"INVALID_TICKET\">Ticket not recognized</cas:authenticationFailure>")
  }
  fmt.Fprintln(w, `</cas:serviceResponse>`)
}

func main() {
  port := os.Getenv("PORT")
  if port == "" {
    port = "8081"
  }
  s := newServer()
  mux := http.NewServeMux()
  mux.HandleFunc("/cas-server/login", s.handleLogin)
  mux.HandleFunc("/cas-server/validate", s.handleValidate)
  mux.HandleFunc("/cas-server/serviceValidate", s.handleServiceValidate)
  log.Printf("Starting minimal CAS server on :%s", port)
  if err := http.ListenAndServe(":"+port, mux); err != nil {
    log.Fatalf("server error: %v", err)
  }
}
