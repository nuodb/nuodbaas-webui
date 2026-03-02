// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.advanced;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.Builder;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.apache.hc.core5.http.HttpStatus;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nuodb.selenium.SeleniumTestHelper;
import com.nuodb.selenium.TestRoutines;

public class IdpTests extends TestRoutines {
    public static final String KC_ADMIN = "admin";
    public static final String KC_ADMIN_PASSWORD = "passw0rd";
    public static final String KC_BASE_URL = "http://localhost/keycloak";
    public static final Duration KC_TIMEOUT = Duration.ofSeconds(10);
    public static final String REALM = "test";

    private static ObjectMapper mapper = new ObjectMapper();
    private static String accessToken = null;

    @BeforeAll
    public static void beforeAll() throws IOException, InterruptedException {
        TestRoutines.beforeAll();
        accessToken = kcLogin();
        kcCreateRealm(REALM);
        kcRegisterCasClient(REALM);
    }

    @AfterAll
    public static void afterAll() throws IOException, InterruptedException {
        kcDeleteRealm(REALM);
        TestRoutines.afterAll();
    }

    @Test
    public void testCasKeycloak() throws IOException, InterruptedException {
        get("/ui");
        waitRestComplete();
        String user = shortUnique("u");
        kcCreateUser(REALM, user, "first", "last", "user@example.com", "passw0rd");
        waitElement("login_cas-keycloak").click();
        waitInputElementByName("username").sendKeys(user);
        waitInputElementByName("password").sendKeys("passw0rd");
        waitElementById("kc-login").click();
        clickMenu(Resource.databases.name());
        assertEquals("NuoDB", getTitle());
    }

    @Test
    public void testCasKeycloakInvalid() throws IOException, InterruptedException {
        get("/ui");
        waitRestComplete();
        kcCreateUser(REALM, shortUnique("u"), "first", "last", "user@example.com", "passw0rd");
        waitElement("login_cas-keycloak").click();
        waitInputElementByName("username").sendKeys("userinvalid");
        waitInputElementByName("password").sendKeys("passw0rd");
        waitElementById("kc-login").click();
        waitElementById("input-error-username");
    }

    @Test
    public void testCasSimple() throws IOException, InterruptedException {
        get("/ui");
        waitRestComplete();
        waitElement("login_cas-simple").click();
        waitInputElementByName("username").sendKeys("usersimple");
        waitInputElementByName("password").sendKeys("passw0rd");
        waitElementById("login-button").click();
        clickMenu(Resource.databases.name());
        assertEquals("NuoDB", getTitle());
    }

    @Test
    public void testCasSimpleInvalid() throws IOException, InterruptedException {
        get("/ui");
        waitRestComplete();
        waitElement("login_cas-simple").click();
        waitInputElementByName("username").sendKeys("usersimple");
        waitInputElementByName("password").sendKeys("invalidpassword");
        waitElementById("login-button").click();
        assertTrue(hasText("invalid username/password"));
    }

    private static String kcLogin() throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = newHttpRequestBuilder()
            .uri(URI.create(KC_BASE_URL + "/realms/master/protocol/openid-connect/token"))
            .setHeader("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString("username=admin&password=passw0rd&grant_type=password&client_id=admin-cli"))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if(response.statusCode() != HttpStatus.SC_OK) {
            throw new IOException("Unable to create Keycloak access token");
        }
        ObjectNode body = (ObjectNode)mapper.readTree(response.body());
        return body.get("access_token").asText();
    }

    private static void kcCreateRealm(String realm) throws IOException, InterruptedException {
        ObjectNode body = mapper.createObjectNode();
        body.put("realm", realm);
        body.put("enabled", true);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = newHttpRequestBuilder()
            .uri(URI.create(KC_BASE_URL + "/admin/realms"))
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if(response.statusCode() != HttpStatus.SC_CREATED) {
            throw new IOException("Unable to create Keycloak realm");
        }
    }

    private static void kcCreateUser(String realm, String username, String firstName, String lastName, String email, String password) throws IOException, InterruptedException {
        ObjectNode body = mapper.createObjectNode();
        body.put("username", username);
        body.put("enabled", true);
        body.put("firstName", firstName);
        body.put("lastName", lastName);
        body.put("email", email);
        body.put("emailVerified", true);
        ObjectNode credential = mapper.createObjectNode();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", false);
        ArrayNode credentials = mapper.createArrayNode();
        credentials.add(credential);
        body.set("credentials", credentials);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = newHttpRequestBuilder()
            .uri(URI.create(KC_BASE_URL + "/admin/realms/" + URLEncoder.encode(realm, StandardCharsets.UTF_8) + "/users"))
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if(response.statusCode() != HttpStatus.SC_CREATED) {
            throw new IOException("Unable to create Keycloak user");
        }
    }

    private static void kcDeleteRealm(String realm) throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = newHttpRequestBuilder()
            .uri(URI.create(KC_BASE_URL + "/admin/realms/" + URLEncoder.encode(realm, StandardCharsets.UTF_8)))
            .DELETE()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if(response.statusCode() != HttpStatus.SC_NO_CONTENT) {
            throw new IOException("Unable to delete realm");
        }
    }

    private static void kcRegisterCasClient(String realm) throws IOException, InterruptedException {
        ObjectNode body = mapper.createObjectNode();
        body.put("protocol", "cas");
        body.put("clientId", "cas");
        body.put("rootUrl", SeleniumTestHelper.URL_BASE + "/ui");
        body.put("baseUrl", SeleniumTestHelper.URL_BASE + "/ui/");
        body.set("redirectUris", mapper.createArrayNode().add("/*"));
        body.put("publicClient", true);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(KC_BASE_URL + "/admin/realms/" + URLEncoder.encode(realm, StandardCharsets.UTF_8) + "/clients"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + accessToken)
            .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
            .timeout(KC_TIMEOUT)
            .version(HttpClient.Version.HTTP_1_1)
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if(response.statusCode() != HttpStatus.SC_CREATED) {
            throw new IOException("Unable to create CAS client");
        }
    }

    private static Builder newHttpRequestBuilder() {
        return HttpRequest.newBuilder()
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + accessToken)
            .timeout(KC_TIMEOUT)
            .version(HttpClient.Version.HTTP_1_1);
    }
}
