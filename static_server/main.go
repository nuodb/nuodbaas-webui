// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
package main

import (
    "crypto/md5"
    "errors"
    "fmt"
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
    mimeType := mime.TypeByExtension(filepath.Ext(filename))
    return strings.HasPrefix(mimeType, "text/") || mimeType == "application/json"
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

	mime.AddExtensionType(".js", "text/javascript")
	mime.AddExtensionType(".ts", "text/typescript")
	mime.AddExtensionType(".tsx", "text/tsx")
	mime.AddExtensionType(".jsx", "text/jsx")

    cache := newFileCache()
    prefix := os.Getenv("NUODBAAS_WEBUI_PATH_PREFIX")
    prefix = strings.Trim(prefix, "/")
    prefixAlternate := os.Getenv("NUODBAAS_WEBUI_PATH_PREFIX_ALTERNATE")
    prefixAlternate = strings.Trim(prefixAlternate, "/")
    cpRestUrl := os.Getenv("NUODB_CP_REST_URL")
    sqlRestUrl := os.Getenv("NUODB_SQL_REST_URL")
    multiInstanceJson := os.Getenv("NUODB_MULTI_INSTANCE_JSON")
    multiInstanceRegistryUrl := os.Getenv("NUODB_MULTI_INSTANCE_REGISTRY_URL")
    if multiInstanceJson != "" {
        multiInstanceRegistryUrl = "/ui/multiinstance.json"
        cache.Set(filepath.Join(staticDir, "ui/multiinstance.json"), []byte(multiInstanceJson))
    }
    multiInstanceName := os.Getenv("NUODB_MULTI_INSTANCE_NAME")
    if multiInstanceName == "" {
        multiInstanceName = strings.Split(os.Getenv("NUODBAAS_WEBUI_HOSTS"), ",")[0]
    }

    handler := func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet && r.Method != http.MethodHead && r.Method != http.MethodOptions {
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
            serveData(r, w, filePath, data)
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

            if !errors.Is(err, os.ErrNotExist) {
                log.Println("Error opening file \"%s\": %v", filePath, err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
                return
            }

            filePath = filepath.Join(staticDir, "ui/index.html")
            if data, ok := cache.Get(filePath); ok {
                serveData(r, w, filePath, data)
                return
            }

            if f, err = os.Open(filePath); err != nil {
                if !errors.Is(err, os.ErrNotExist) {
                    log.Println("Error opening file \"%s\": %v", filePath, err)
                    http.Error(w, "Internal Server Error", http.StatusInternalServerError)
                    return
                }

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
            if prefix != "" {
                data = replace(data, "/ui\"", "/" + prefix + "\"")
                data = replace(data, "/ui/", "/" + prefix + "/")
            }
            if prefixAlternate != "" {
                data = replace(data, "/webui\"", "/" + prefixAlternate + "\"")
                data = replace(data, "/webui/", "/" + prefixAlternate + "/")
            }
            data = replace(data, "___NUODB_CP_REST_URL___", cpRestUrl)
            data = replace(data, "___NUODB_SQL_REST_URL___", sqlRestUrl)
            data = replace(data, "___NUODB_MULTI_INSTANCE_REGISTRY_URL___", multiInstanceRegistryUrl)
            data = replace(data, "___NUODB_MULTI_INSTANCE_NAME___", multiInstanceName)
        }

        if cacheFile {
            cache.Set(filePath, data)
        }
        serveData(r, w, filePath, data)
    }

    http.HandleFunc("/", handler)
    log.Println("Serving static files on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func checkIfNoneMatch(r *http.Request, currentETag string) bool {
	ifNoneMatch := r.Header.Get("If-None-Match")
	if ifNoneMatch == "" {
		return false
	}

	// Wildcard match means any cached version is acceptable
	if ifNoneMatch == "*" {
		return true
	}

	// Handle comma-separated lists and trim weak ETag prefixes
	etags := strings.Split(ifNoneMatch, ",")
	cleanCurrent := strings.TrimPrefix(currentETag, "W/")

	for _, etag := range etags {
		clientETag := strings.TrimSpace(etag)
		clientETag = strings.TrimPrefix(clientETag, "W/")

		if clientETag == cleanCurrent {
			return true
		}
	}

	return false
}

func serveData(r *http.Request, w http.ResponseWriter, filePath string, data []byte) {
    ext := filepath.Ext(filePath)
    mimeType := mime.TypeByExtension(ext)
    if mimeType != "" {
        w.Header().Set("Content-Type", mimeType)
    } else {
        w.Header().Set("Content-Type", "application/octet-stream")
    }

    if strings.HasPrefix(filePath, "static/ui/assets/") {
        // preventing Browser from re-requesting asset files for the next 24 hours
        // The filename has a hash of the file content, so no need for the browser to load the file the next time
        w.Header().Set("Cache-Control", "public, max-age=86400");
    }

    etag := fmt.Sprintf(`"%x"`, md5.Sum(data))
    w.Header().Set("ETag", etag)
    if checkIfNoneMatch(r, etag) {
        w.WriteHeader(http.StatusNotModified)
        return
    }

    if len(data) == 0 {
        w.WriteHeader(http.StatusNoContent)
    } else {
        w.WriteHeader(http.StatusOK)
    }

    if r.Method == http.MethodHead || r.Method == http.MethodOptions {
        return;
    }

    w.Write(data)
}
