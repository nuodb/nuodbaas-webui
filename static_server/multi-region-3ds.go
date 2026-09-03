// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "net/url"
    "os"
    "strings"
    "time"
)

type EnvironmentType struct {
    Cluster string `json:"cluster"`
    Datacenter string `json:"datacenter"`
}

type PrometheusResponse struct {
    Data struct {
        Result []struct {
            Metric EnvironmentType `json:"metric"`
        } `json:"result"`
    } `json:"data"`
}

func isValidEnvironment(environment string) bool {
    return environment == "stg" || environment == "ppd" || environment == "prd"
}

func getSubDomain(environment string) string {
	if environment == "stg" {
		return "3dx-staging"
	}
	return "3dexperience"
}

func getClusterRegion(environment string, datacenter string) string {
	if environment != "stg" {
		if datacenter == "euw1" {
			return "eu1"
		} else if datacenter == "use1" {
			return "us1"
		}
	}
	return datacenter
}

func getPrometheusUrl(environment string) string {
    return "https://eu2-sup" + environment + "-realtime." + getSubDomain(environment) + ".3ds.com/timeseries/api/v1/query"
}

func getClusterName(environment string, datacenter string, cluster string) string {
	return getClusterRegion(environment, datacenter) + "-" + cluster
}

func getClusterUrl(environment string, datacenter string, cluster string) string {
	return fmt.Sprintf("https://%s-nuodbaas.%s.3ds.com", getClusterName(environment, datacenter, cluster), getSubDomain(environment))
}

type Entry struct {
    Name string `json:"name"`
    URL  string `json:"url"`
    SqlUrl string `json:"sqlUrl"`
    CpUrl string `json:"cpUrl"`
    // internal timestamp, omitted from JSON responses
    expires time.Time `json:"-"`
}

var httpClient = &http.Client{
    Timeout: 30 * time.Second,
}

func fetchEnvironments(prometheusUrl string, username string, password string) ([]EnvironmentType, error) {
    query := `count by (datacenter, cluster) (resource_status_ready{admin_tenant=~"Adm.*"})`
    reqURL := prometheusUrl + "?query=" + url.PathEscape(query)

    ctxTimeout, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

    req, err := http.NewRequestWithContext(ctxTimeout, http.MethodGet, reqURL, nil)
    if err != nil {
        return nil, err
    }

    req.SetBasicAuth(username, password)

    resp, err := httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("unexpected status %s: %s", resp.Status, string(body))
    }

    // Read and unmarshal the JSON response.
    var result PrometheusResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        log.Printf("failed to decode Prometheus response")
        return nil, err
    }

    environments := []EnvironmentType{}

    for _, item := range result.Data.Result {
        cluster := item.Metric.Cluster
        datacenter := item.Metric.Datacenter
        environments = append(environments, EnvironmentType{Cluster: cluster, Datacenter: datacenter})
    }
    return environments, nil
}

func Populate3DS(cache *fileCache) {
    environments := strings.Split(os.Getenv("POPULATE_3DS_ENVIRONMENTS"), ",")
    username := os.Getenv("MULTI_INSTANCE_POPULATE_3DS_PROMETHEUS_USERNAME")
    password := os.Getenv("MULTI_INSTANCE_POPULATE_3DS_PROMETHEUS_PASSWORD")

    if username == "" || password == "" || (len(environments) == 1 && environments[0] == "") {
        log.Println("3DS population disabled")
        return
    } else {
        log.Println("3DS population started")
    }

    for {
		entries := make([]Entry, 0, 10)
        count := 0
        for _, environment := range(environments) {
            environment = strings.TrimSpace(environment)
            if !isValidEnvironment(environment) {
                log.Printf("Invalid environment: %q - ignoring", environment)
                continue
            }

            envs, err := fetchEnvironments(getPrometheusUrl(environment), username, password)
            if err != nil {
                log.Printf("Error fetching: %v", err)
                continue
            }

            for _, env := range(envs) {
                datacenter := env.Datacenter
                cluster := env.Cluster
                region := datacenter
                if environment != "stg" {
                    if region == "euw1" {
                        region = "eu1"
                    } else if region == "use1" {
                        region = "us1"
                    }
                }

                var entry Entry
                entry.Name = getClusterName(environment, datacenter, cluster)
                hostUrl := getClusterUrl(environment, datacenter, cluster)
                entry.URL = hostUrl + "/nuodbaas"
                entry.CpUrl = hostUrl + "/api"
                entry.SqlUrl = hostUrl + "/api/sql"
				entries = append(entries, entry)

                count++
            }
        }

		jsonEntries, err := json.Marshal(entries)
		if err != nil {
			log.Println("Error marshaling multi-instance entries:", err)
		} else {
	        cache.Set(MULTI_INSTANCE_JSON, []byte(jsonEntries))
		}
        log.Printf("Fetched %d regions from 3DS\n", count)
        time.Sleep(POLL_INTERVAL)
    }
}
