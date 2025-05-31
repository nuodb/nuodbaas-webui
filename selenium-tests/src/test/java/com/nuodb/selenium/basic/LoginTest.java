// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
        sendKeys("organization", "invalid_org");
        sendKeys("username", "invalid_user");
        sendKeys("password", "invalid_password");
        click("login_button");
        assertEquals("Login failed: Bad credentials", waitText("error_message"));
    }

    @Test
    public void testLogin() throws MalformedURLException {
        login();
    }

    @Test
    public void testIdp() throws MalformedURLException {
        get("/ui/login");
        assertEquals("Login with Central Authentication Service", waitText("login_cas-idp"));
    }

    @Test
    public void testNonExistentIdp() throws MalformedURLException {
        get("/ui/login?provider=bogus");
        assertEquals("Logging in with bogus...", waitText("progress_message"));
        assertEquals("Login failed: No provider named bogus", waitText("error_message"));
    }

    @Test
    public void testInvalidIdpLoginRequest() throws MalformedURLException {
        get("/ui/login?provider=cas-idp");
        assertEquals("Logging in with cas-idp...", waitText("progress_message"));
        assertEquals("Login failed: Query parameter 'ticket' not supplied", waitText("error_message"));
    }

    @Test
    public void testUnsuccessfulIdpLogin() throws MalformedURLException {
        get("/ui/login?provider=cas-idp&ticket=ST-123");
        assertEquals("Logging in with cas-idp...", waitText("progress_message"));
        // request should fail with 500 Internal Server Error due to CAS address being unreachable by REST service
        assertEquals("Login failed: Request failed with status code 500", waitText("error_message"));
    }
}
