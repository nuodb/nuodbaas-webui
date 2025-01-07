// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.hc.client5.http.ClientProtocolException;
import org.apache.hc.client5.http.HttpHostConnectException;
import org.apache.hc.client5.http.classic.methods.HttpDelete;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPut;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ClassicHttpRequest;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.ParseException;
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
    public static final String CP_USERNAME = Constants.ADMIN_ORGANIZATION + "/" + Constants.ADMIN_USER;
    public static final String CP_AUTHORIZATION = "Basic " + Base64.getEncoder().encodeToString(
        (CP_USERNAME + ":" + Constants.ADMIN_PASSWORD)
        .getBytes(StandardCharsets.UTF_8));
    public static final String MENU_COLUMN = "$ref";

    private static final int MAX_RETRIES = 10;
    private static final Duration RETRY_WAIT_TIME = Duration.ofMillis(500);

    Map<Resource, Set<String>> createdResources = new HashMap<>();

    @AfterEach
    public void after() {
        // clean up all the created resources except admin user
        for(int i=Resource.values().length-1; i >= 0; i--) {
            Resource resource = Resource.values()[i];
            try {
                List<String> items = getResourcesRest(resource);
                for(String item : items) {
                    if(resource != Resource.users || !item.equals(CP_USERNAME)) {
                        System.out.println("Deleting resource " + resource.name() + "/" + item);
                        try {
                            deleteResourceRest(resource, item);
                        }
                        catch(IOException e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
            catch(IOException|RuntimeException e) {
                e.printStackTrace();
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
    public void clickMenu(String resource) {
        final int maxRetries = 3;
        for(int retry=0; retry<3; retry++) {
            try {
                waitElement("menu-button-" + resource).click();
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

    public void clickPopupMenu(WebElement element, String dataTestId) {
        List<WebElement> menuToggles = element.findElements(By.xpath("div[@data-testid='menu-toggle']"));
        assertEquals(1, menuToggles.size());
        menuToggles.get(0).click();
        WebElement menuPopup = getElement("menu-popup");
        List<WebElement> menuItems = menuPopup.findElements(By.xpath(".//div[@data-testid='" + dataTestId + "']"));
        assertEquals(1, menuItems.size());
        menuItems.get(0).click();
    }

    public void clickUserMenu(String dataTestId) {
        WebElement userMenu = waitElement("user-menu");
        clickPopupMenu(userMenu, dataTestId);
    }

    private void createResource(Resource resource, String name, String ...fieldValueList) {
        clickMenu(resource.name());

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
        clickMenu(resource.name());
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", name, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "delete_button");
        waitElement("dialog_button_yes").click();
        createdResources.get(resource).remove(name);
    }

    /**
     * performs authenticated REST call. Returns response body
     * @param request
     * @return
     */
    public String rest(ClassicHttpRequest request) throws IOException {
        request.setHeader("Authorization", CP_AUTHORIZATION);
        try(CloseableHttpClient httpClient = HttpClients.createDefault()) {
            return httpClient.execute(request, new HttpClientResponseHandler<String>(){
                @Override
                public String handleResponse(ClassicHttpResponse httpResponse) throws IOException {
                    if (httpResponse.getCode() < 200 || httpResponse.getCode() >= 300) {
                        throw new IOException("Invalid status code " + httpResponse.getCode());
                    }

                    HttpEntity entity = httpResponse.getEntity();
                    if(entity != null) {
                        try {
                            return EntityUtils.toString(httpResponse.getEntity(), StandardCharsets.UTF_8);
                        }
                        catch(ParseException e) {
                            throw new IOException(e);
                        }
                    }
                    return "";
                }
            });
        }
        catch(ClientProtocolException e) {
            throw new IOException(e);
        }
    }

    /** retries rest call on specified exceptions */
    public String restRetry(ClassicHttpRequest request, Class<?> ...clazz) throws RuntimeException {
        List<Exception> exceptions = new ArrayList<>();
        do {
            try {
                return rest(request);
            }
            catch(RuntimeException | IOException e) {
                exceptions.add(e);
            }

            boolean isMatch = false;
            for(int i=0; i<clazz.length; i++) {
                if(clazz[i].isInstance(exceptions.get(exceptions.size()-1))) {
                    isMatch = true;
                    break;
                }
            }
            if(!isMatch) {
                break;
            }
            else {
                if(exceptions.size() + 1 < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_WAIT_TIME.toMillis());
                    }
                    catch(InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException(e);
                    }
                }
            }
        }
        while(exceptions.size() < MAX_RETRIES);

        RuntimeException error;
        if(exceptions.size() == MAX_RETRIES) {
            error = new RuntimeException("Exhausted " + MAX_RETRIES + " retries", exceptions.get(exceptions.size()-1));
        }
        else {
            error = new RuntimeException(exceptions.get(exceptions.size()-1));
        }

        for(int i=0; i<exceptions.size()-1; i++) {
            error.addSuppressed(exceptions.get(i));
        }
        throw error;
    }

    public String createResourceRest(Resource resource, String path, String body) throws IOException {
        if(path == null) {
            path = "";
        }
        else if(!path.startsWith("/")) {
            path = "/" + path;
        }
        HttpPut request = new HttpPut(CP_URL + "/" + resource.name() + path);
        request.setEntity(new StringEntity(body, ContentType.APPLICATION_JSON));
        return restRetry(request, HttpHostConnectException.class);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ListResponse {
        private List<String> items;

        public List<String> getItems() {
            return items;
        }
    }

    /** Returns list of items of the specified resource */
    public List<String> getResourcesRest(Resource resource) throws IOException {
        HttpGet request = new HttpGet(CP_URL + "/" + resource.name());
        String body = restRetry(request, HttpHostConnectException.class);
        ObjectMapper mapper = new ObjectMapper();
        try {
            ListResponse response = mapper.readValue(body, ListResponse.class);
            return response.getItems();
        }
        catch(JsonProcessingException e) {
            throw new IOException(e);
        }
    }

    public boolean deleteResourceRest(Resource resource, String name) throws IOException {
        HttpDelete request = new HttpDelete(CP_URL + "/" + resource.name() + "/" + name);
        String body = restRetry(request, HttpHostConnectException.class);
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
