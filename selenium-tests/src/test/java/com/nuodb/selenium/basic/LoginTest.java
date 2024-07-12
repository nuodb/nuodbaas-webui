package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.nuodb.selenium.SeleniumTestHelper;

import java.net.MalformedURLException;

public class LoginTest extends SeleniumTestHelper {

    @Test
    public void testTitle() throws MalformedURLException {
        get("/ui/");
        assertEquals("NuoDB", getTitle());
    }

    @Test
    public void testInvalidLogin() throws MalformedURLException {
        get("/ui/");
        sendKeys("username", "invalid_user");
        sendKeys("password", "invalid_password");
        click("login_button");
        assertEquals("Invalid Credentials", getText("error_message"));
    }

    @Test
    public void testLogin() throws MalformedURLException {
        get("/ui/");
        sendKeys("username", "acme/user1");
        sendKeys("password", "passw0rd");
        click("login_button");
        assertEquals("Home", getText("title", 10));
    }
}