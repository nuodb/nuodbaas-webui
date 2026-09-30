// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
package main

import (
    "bytes"
    "crypto/md5"
    "crypto/rand"
    "encoding/hex"
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
    "time"
)

type cacheEntry struct {
    data []byte
    hasNonce bool
}

type fileCache struct {
    mu    sync.RWMutex
    files map[string]cacheEntry
}

func newFileCache() *fileCache {
    return &fileCache{files: make(map[string]cacheEntry)}
}

func (c *fileCache) Get(path string) ([]byte, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    entry, ok := c.files[path]
    if !ok {
        return nil, false
    }
    return entry.data, entry.hasNonce
}

func (c *fileCache) Set(path string, data []byte, hasNonce bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.files[path] = cacheEntry{data, hasNonce}
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

const STATIC_DIR = "static"

// updateDirectoryServer periodically posts the config.json to the multi-instance registry.
func updateDirectoryServerThread() {
    registryURL := os.Getenv("NUODB_MULTI_INSTANCE_REGISTRY_URL")
    username := os.Getenv("NUODB_MULTI_INSTANCE_USERNAME")
    password := os.Getenv("NUODB_MULTI_INSTANCE_PASSWORD")
    if registryURL == "" || username == "" || password == "" {
        return
    }

    prefix := strings.Trim(os.Getenv("NUODBAAS_WEBUI_PATH_PREFIX"), "/")
    configPath := filepath.Join(STATIC_DIR, prefix, "config.json")

    go func() {
        for {
            data, err := os.ReadFile(configPath)
            if err != nil {
                log.Printf("Failed to read config file %s: %v", configPath, err)
            } else {
                req, err := http.NewRequest(http.MethodPost, registryURL, bytes.NewReader(data))
                if err != nil {
                    log.Printf("Failed to create request for %s: %v", registryURL, err)
                } else {
                    req.SetBasicAuth(username, password)
                    client := &http.Client{}
                    resp, err := client.Do(req)
                    if err != nil {
                        log.Printf("Error posting to %s: %v", registryURL, err)
                    } else {
                        // Drain and close body to reuse connections.
                        io.Copy(io.Discard, resp.Body)
                        resp.Body.Close()
                    }
                }
            }
            time.Sleep(300 * time.Second)
        }
    }()
}

func main() {
    // Directory where static files are located (relative to the binary)
    if _, err := os.Stat(STATIC_DIR); os.IsNotExist(err) {
        log.Fatalf("static directory %s does not exist", STATIC_DIR)
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
        cache.Set(filepath.Join(STATIC_DIR, "ui/multiinstance.json"), []byte(multiInstanceJson), false)
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
        filePath := filepath.Join(STATIC_DIR, p)

        // Serve from cache if present
        if data, hasNonce := cache.Get(filePath); data != nil {
            serveData(r, w, filePath, data, hasNonce)
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

            filePath = filepath.Join(STATIC_DIR, "ui/index.html")
            if data, hasNonce := cache.Get(filePath); data != nil {
                serveData(r, w, filePath, data, hasNonce)
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

        hasNonce := false

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
            hasNonce = bytes.Contains(data, []byte("___NONCE___"))
        }

        if cacheFile {
            cache.Set(filePath, data, hasNonce)
        }
        serveData(r, w, filePath, data, hasNonce)
    }

    updateDirectoryServerThread()

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

func createNonce() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

func serveData(r *http.Request, w http.ResponseWriter, filePath string, data []byte, hasNonce bool) {
    ext := filepath.Ext(filePath)
    mimeType := mime.TypeByExtension(ext)
    if mimeType != "" {
        w.Header().Set("Content-Type", mimeType)
    } else {
        w.Header().Set("Content-Type", "application/octet-stream")
    }

    nonceExpression := "'none'"

    if hasNonce {
        nonce := createNonce();
        nonceExpression = "'nonce-" + nonce + "'";
        data = bytes.ReplaceAll(data, []byte("___NONCE___"), []byte(nonce))
    }

    hosts := strings.Split(os.Getenv("NUODBAAS_WEBUI_HOSTS"), ",")
    selfExpression := ""
    for _, host := range hosts {
        if host != "" {
            selfExpression = "https://" + host + "/ "
        }
    }
    if selfExpression == "" {
        selfExpression = "'self'";
    }

    registryURL := os.Getenv("NUODB_MULTI_INSTANCE_REGISTRY_URL")

    w.Header().Set("Content-Security-Policy",
        "default-src 'none'; " +
        "script-src " + nonceExpression + "; " +
        "script-src-elem " + nonceExpression + "; " +
        "script-src-attr 'none'; " +
        "style-src " + selfExpression + " " + nonceExpression + "; " +
        "child-src 'none'; " +
        "connect-src " + selfExpression + "; " +
        "fenced-frame-src 'none'; " +
        "font-src data: " + selfExpression + "; " +
        "frame-src " + selfExpression + " " + registryURL + "; " +
        "img-src " + selfExpression + "; " +
        "manifest-src " + selfExpression + "; " +
        "media-src 'none'; " +
        "object-src 'none'; " +
        "worker-src 'none'; " +
        "base-uri " + selfExpression + "; " +
        "form-action 'none'; " +
        "frame-ancestors " + selfExpression + "; " +
        "require-trusted-types-for 'script'; " +
        "trusted-types * 'allow-duplicates';" +
        "upgrade-insecure-requests; " +
        "")

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
