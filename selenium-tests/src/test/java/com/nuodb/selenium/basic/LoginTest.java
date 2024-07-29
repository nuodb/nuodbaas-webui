package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.nuodb.selenium.Constants;
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
        assertEquals("Invalid Credentials", waitText("error_message"));
    }

    @Test
    public void testLogin() throws MalformedURLException {
        login(Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
    }
}