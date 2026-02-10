// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.nuodb.selenium.TestRoutines;

import java.net.MalformedURLException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class ErrorPagesTest extends TestRoutines {

    @Test
    public void testNotFound() throws MalformedURLException {
        loginRest();
        get("/ui/this-page-does-not-exist");
        waitElement("not-found-header");
        waitElement("button.ok").click();
        waitElement("list_resource__table");
    }

    @Test
    public void testErrorPage() throws MalformedURLException {
        loginRest();
        String errorMessage = "Some Message";
        get("/ui/error?msg=" + URLEncoder.encode(errorMessage, StandardCharsets.UTF_8));
        waitElement("error-page-title");
        assertEquals(errorMessage, getElement("error-page-message").getText());
        waitElement("button.ok").click();
        waitElement("list_resource__table");
    }

    @Test
    public void crashTest() throws MalformedURLException {
        loginRest();
        get("/ui/error?crashme=true");
        assertEquals("Error: Simulate crash", waitElement("error-message").getText());
        waitElement("button.ok").click();
        waitElement("list_resource__table");
    }

    @Test
    public void testRedirectAnonymous() throws MalformedURLException {
        String url = "/webui/error";
        get(url);
        waitElement("show_login_button");
        assertEquals(URL_BASE + "/ui/login?redirect=" + URLEncoder.encode(url, StandardCharsets.UTF_8), getCurrentUrl());
    }

    @Test
    public void testRedirectAuthenticated() throws MalformedURLException {
        loginRest();
        get("/webui/error");
        waitElement("error-page-title");
        assertEquals(URL_BASE + "/ui/error", getCurrentUrl());
    }
}
