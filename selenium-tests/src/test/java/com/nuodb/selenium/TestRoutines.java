package com.nuodb.selenium;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.hc.client5.http.classic.methods.HttpDelete;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPut;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.io.HttpClientResponseHandler;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.junit.jupiter.api.AfterEach;
import org.openqa.selenium.By;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebElement;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class TestRoutines extends SeleniumTestHelper {
    public static final String CP_URL = "http://localhost:8081";
    public static final String CP_USERNAME = "acme/admin";
    public static final String CP_PASSWORD = "passw0rd";
    public static final String CP_AUTHORIZATION = "Basic " + Base64.getEncoder().encodeToString((CP_USERNAME + ":" + CP_PASSWORD).getBytes(StandardCharsets.UTF_8));

    Map<Resource, Set<String>> createdResources = new HashMap<>();

    @AfterEach
    public void after() {
        // clean up all the created resources except admin user
        for(int i=Resource.values().length-1; i >= 0; i--) {
            Resource resource = Resource.values()[i];
            List<String> items = getResourcesRest(resource);
            for(String item : items) {
                if(resource != Resource.users || !item.equals(CP_USERNAME)) {
                    System.out.println("Deleting resource " + resource.name() + "/" + item);
                    deleteResourceRest(resource, item);
                }
            }
        }
    }

    /* keep in right order - it deletes the resources from the bottom up */
    public enum Resource {
        users,
        projects,
        databases,
        backups
    }

    /**
     * Creates shortened unique resource name based on system time
     * Algorithm: take current time of last 30 days in 10ms granularity and Base36 encode
     *            to provide a valid resource name. Prepend with the prefix
     * @param prefix if null, use "s"
     * @return shortened unique name
     */
    public String shortUnique(String prefix) {
        final String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder();
        if(prefix == null) {
            sb.append("s");
        }
        else {
            sb.append(prefix);
        }
        int value = (int)(System.currentTimeMillis() % (30*24*3600*1000))/10;
        while(value > 0) {
            sb.append(chars.charAt(value % 36));
            value = value / 36;
        }
        return sb.toString();
    }
    public void clickMenuItem(String item) {
        final int maxRetries = 3;
        for(int retry=0; retry<3; retry++) {
            try {
                findElementFromList("menu-button-", item).click();
                break;
            }
            catch(StaleElementReferenceException e) {
                if(retry+1 == maxRetries) {
                    throw e;
                }
            }
        }
        waitRestComplete();
    }

    public void waitRestComplete() {
        waitElement("rest_spinner__complete");
    }

    private void createResource(Resource resource, String name, String ...fieldValueList) {
        clickMenuItem(resource.name());

        WebElement createButton = waitElement("list_resource__create_button");
        createButton.click();
        for (int i=0; i<fieldValueList.length; i += 2) {
            waitInputElementByName(fieldValueList[i]).sendKeys(fieldValueList[i+1]);
        }
        waitElement("create_resource__create_button").click();
        createdResources.computeIfAbsent(resource, n -> new HashSet<String>()).add(name);
        waitRestComplete();
    }

    public void deleteResource(Resource resource, String name) {
        clickMenuItem(resource.name());
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", name, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> deleteButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='delete_button']"));
        assertEquals(1, deleteButtons.size());
        deleteButtons.get(0).click();
        createdResources.get(resource).remove(name);
    }

    /**
     * performs authenticated REST call. Returns response body or null on failure.
     * @param request
     * @return
     */
    public String rest(ClassicHttpRequest request) {
        request.addHeader("Authorization", CP_AUTHORIZATION);
        try(CloseableHttpClient httpClient = HttpClients.createDefault()) {
            return httpClient.execute(request, new HttpClientResponseHandler<String>(){
                @Override
                public String handleResponse(ClassicHttpResponse httpResponse) throws IOException {
                    if (httpResponse.getCode() < 200 || httpResponse.getCode() >= 300) {
                        return null;
                    }
                    try {
                        HttpEntity entity = httpResponse.getEntity();
                        if(entity != null) {
                            return EntityUtils.toString(httpResponse.getEntity(), StandardCharsets.UTF_8);
                        }
                        return null;
                    }
                    catch(Exception e) {
                        e.printStackTrace();
                        return null;
                    }
                }
            });
        }
        catch(Exception e) {
            return null;
        }
    }

    public String createResourceRest(Resource resource, String path, String body) {
        if(path == null) {
            path = "";
        }
        else if(!path.startsWith("/")) {
            path = "/" + path;
        }
        HttpPut request = new HttpPut(CP_URL + "/" + resource.name() + path);
        request.setEntity(new StringEntity(body, ContentType.APPLICATION_JSON));
        return rest(request);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ListResponse {
        private List<String> items;

        public List<String> getItems() {
            return items;
        }
    }

    /** Returns list of items of the specified resource */
    public List<String> getResourcesRest(Resource resource) {
        HttpGet request = new HttpGet(CP_URL + "/" + resource.name());
        String body = rest(request);
        ObjectMapper mapper = new ObjectMapper();
        try {
            ListResponse response = mapper.readValue(body, ListResponse.class);
            return response.getItems();
        }
        catch(JsonProcessingException e) {
            e.printStackTrace();
            return null;
        }
    }

    public boolean deleteResourceRest(Resource resource, String name) {
        HttpDelete request = new HttpDelete(CP_URL + "/" + resource.name() + "/" + name);
        String body = rest(request);
        return body != null;
    }

    public String createUser() {
        String name = shortUnique("u");
        createResource(Resource.users, name,
            "organization", "acme",
            "name", name,
            "password", "passw0rd",
            "accessRule.allow.0", "all:acme"
        );
        return name;
    }

    public void deleteUser(String userName) {
        deleteResource(Resource.users, userName);
    }

    public String createProject() {
        String name = shortUnique("p");
        createResource(Resource.projects, name,
            "organization", "acme",
            "name", name,
            "sla", "dev",
            "tier", "n0.nano"
        );
        return name;
    }

    public void deleteProject(String projectName) {
        deleteResource(Resource.projects, projectName);
    }

    public String createDatabase(String projectName) {
        String name = shortUnique("d");
        createResource(Resource.databases, name,
            "organization", "acme",
            "project", projectName,
            "name", name,
            "dbaPassword", "passw0rd"
        );
        return name;
    }

    public void deleteDatabase(String databaseName) {
        deleteResource(Resource.databases, databaseName);
    }

    public String createBackup(String projectName, String databaseName) {
        String name = shortUnique("b");
        createResource(Resource.backups, name,
            "organization", "acme",
            "project", projectName,
            "database", databaseName,
            "name", name
        );
        return name;
    }

    public void deleteBackup(String backupName) {
        deleteResource(Resource.backups, backupName);
    }
}
