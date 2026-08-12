// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
package main

import (
    "io"
    "log"
    "mime"
    "net/http"
    "os"
    "path"
    "path/filepath"
    "strings"
    "sync"
)

type fileCache struct {
    mu    sync.RWMutex
    files map[string][]byte
}

func newFileCache() *fileCache {
    return &fileCache{files: make(map[string][]byte)}
}

func (c *fileCache) Get(path string) ([]byte, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    data, ok := c.files[path]
    return data, ok
}

func (c *fileCache) Set(path string, data []byte) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.files[path] = data
}

func isTextFile(filename string) bool {
    ext := filepath.Ext(filename)
    switch ext {
    case ".html", ".css", ".js",".json",".txt":
        return true
    default:
        return false
    }
}

func replace(data []byte, old string, new string) []byte {
    contentStr := string(data)
    contentStr = strings.ReplaceAll(contentStr, old, new)
    return []byte(contentStr)
}

func isDirectory(path string) bool {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return false
	}
	return fileInfo.IsDir()
}

func main() {
    // Directory where static files are located (relative to the binary)
    staticDir := "static"
    if _, err := os.Stat(staticDir); os.IsNotExist(err) {
        log.Fatalf("static directory %s does not exist", staticDir)
    }

    cache := newFileCache()
    prefix := os.Getenv("NUODBAAS_WEBUI_PATH_PREFIX")
    prefix = strings.Trim(prefix, "/")
    prefixAlternate := os.Getenv("NUODBAAS_WEBUI_PATH_PREFIX_ALTERNATE")
    prefixAlternate = strings.Trim(prefixAlternate, "/")
    cpRestUrl := os.Getenv("NUODB_CP_REST_URL")
    sqlRestUrl := os.Getenv("NUODB_SQL_REST_URL")

    handler := func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodHead || r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return;
        }
        if r.Method != http.MethodGet {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
        p := r.URL.Path
        if prefix != "" {
            // Replace prefix with "/ui/" and "/ui\"" respectively
            p = strings.ReplaceAll(p, "/" + prefix + "/", "/ui/")
            p = strings.ReplaceAll(p, "/" + prefix + "\"", "/ui\"")
        }
        // Clean the path to avoid directory traversal attacks
        p = path.Clean(p)
        filePath := filepath.Join(staticDir, p)

        // Serve from cache if present
        if data, ok := cache.Get(filePath); ok {
            serveData(w, filePath, data)
            return
        }

        if isDirectory(filePath) {
            filePath = filepath.Join(filePath, "index.html")
        }

        cacheFile := true
        // Load from disk
        f, err := os.Open(filePath)
        if err != nil {
            // not a static file, serve index.html
            cacheFile = false

            filePath = filepath.Join(staticDir, "ui/index.html")
            if data, ok := cache.Get(filePath); ok {
                serveData(w, filePath, data)
                return
            }

            if f, err = os.Open(filePath); err != nil {
                http.Error(w, "Not Found", http.StatusNotFound)
                return
            }
        }
        defer f.Close()
        data, err := io.ReadAll(f)
        if err != nil {
            http.Error(w, "Failed to read file", http.StatusInternalServerError)
            return
        }

        if isTextFile(filePath) {
            data = replace(data, "/ui\"", "/" + prefix + "\"")
            data = replace(data, "/ui/", "/" + prefix + "/")
            data = replace(data, "/webui\"", "/" + prefixAlternate + "\"")
            data = replace(data, "/webui/", "/" + prefixAlternate + "/")
            data = replace(data, "___NUODB_CP_REST_URL___", cpRestUrl)
            data = replace(data, "___NUODB_SQL_REST_URL___", sqlRestUrl)
        }

        if cacheFile {
            cache.Set(filePath, data)
        }
        serveData(w, filePath, data)
    }

    http.HandleFunc("/", handler)
    log.Println("Serving static files on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func serveData(w http.ResponseWriter, filePath string, data []byte) {
    ext := filepath.Ext(filePath)
    mimeType := mime.TypeByExtension(ext)
    if mimeType != "" {
        w.Header().Set("Content-Type", mimeType)
    } else {
        w.Header().Set("Content-Type", "application/octet-stream")
    }
    w.WriteHeader(http.StatusOK)
    w.Write(data)
}
