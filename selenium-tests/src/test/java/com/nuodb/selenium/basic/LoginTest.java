// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.nuodb.selenium.TestRoutines;

import java.net.MalformedURLException;

public class LoginTest extends TestRoutines {

    @Test
    public void testTitle() throws MalformedURLException {
        get("/ui/");
        assertEquals("NuoDB", getTitle());
    }

    @Test
    public void testInvalidLogin() throws MalformedURLException {
        get("/ui/");
        /**
        * During page load, we retrieve the providers list, which determines the login choices.
        * We wait for these options to appear before proceeding further.
        **/
        retry(() -> {
            if (getElement("show_login_button") != null) {
                click("show_login_button");
            } else {
                assertNotNull(getElement("organization"), "Unable to find Login button or Login form");
            }
        });

        sendKeys("organization", "invalid_org");
        sendKeys("username", "invalid_user");
        sendKeys("password", "invalid_password");
        click("login_button");

        assertTrue(waitText("error_message").contains("Bad credentials"));
    }

    @Test
    public void testLogin() throws MalformedURLException {
        login();
    }

    @Test
    public void testIdp() throws MalformedURLException {
        get("/ui/login");
        retryStale(()->{
            assertEquals("Login With CAS Keycloak", waitText("login_cas-keycloak"));
            assertEquals("Login With CAS Simple", waitText("login_cas-simple"));
        });
    }

    @Test
    public void testNonExistentIdp() throws MalformedURLException {
        get("/ui/login?provider=bogus");
        assertEquals("Logging in with bogus...", waitText("progress_message"));
        assertEquals("Login failed: No provider named bogus", waitText("error_message"));
    }

    @Test
    public void testInvalidIdpLoginRequest() throws MalformedURLException {
        get("/ui/login?provider=cas-simple");
        assertEquals("Logging in with cas-simple...", waitText("progress_message"));
        assertEquals("Login failed: Query parameter 'ticket' not supplied", waitText("error_message"));
    }

    @Test
    public void testUnsuccessfulIdpLogin() throws MalformedURLException {
        get("/ui/login?provider=cas-simple&ticket=ST-123");
        assertEquals("Logging in with cas-simple...", waitText("progress_message"));
        // request should fail with 500 Internal Server Error due to CAS address being unreachable by REST service
        assertEquals("Login failed: Unable to authenticate user with CAS provider cas-simple", waitText("error_message"));
    }
}
