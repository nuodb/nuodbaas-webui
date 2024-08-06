package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.SeleniumTestHelper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.MalformedURLException;
import java.util.List;

public class UserTest extends SeleniumTestHelper {
    public void clickUsersMenu() {
        findElementFromList("menu-button-", "users").click();
    }

    @Test
    public void testShowUsers() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        waitElement("banner-done");
        clickUsersMenu();
        waitElement("list_resource_complete");
    }

    private String createUser() {
        String name = "user" + System.currentTimeMillis();
        clickUsersMenu();
        waitElement("list_resource_complete");
        WebElement createButton = waitElement("list_resource_create_button");
        createButton.click();
        waitInputElementByName("organization").sendKeys("acme");
        waitInputElementByName("name").sendKeys(name);
        waitInputElementByName("password").sendKeys("passw0rd");
        waitInputElementByName("accessRule.allow.0").sendKeys("all:acme");
        waitElement("create_resource_create_button").click();
        waitElement("list_resource_complete");

        return name;
    }

    private void deleteUser(String userName) {
        List<WebElement> buttonsCell = waitTableElements("list_resource_table", "name", userName, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> buttons = buttonsCell.get(0).findElements(By.tagName("button"));
        List<WebElement> deleteButtons = buttons.stream().filter(button -> button.getText().equalsIgnoreCase("Delete")).toList();
        assertEquals(1, deleteButtons.size());
        deleteButtons.get(0).click();
    }

    @Test
    public void testCreateUser() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        waitElement("banner-done");
        String name = createUser();
        deleteUser(name);
    }

    @Test
    public void testListCreateAndDeleteUsers() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        waitElement("banner-done");
        String userName = createUser();
        clickUsersMenu();
        waitElement("list_resource_complete");

        // find user and delete
        deleteUser(userName);

        // verify user is gone
        waitElement("list_resource_complete");
        sleep(1000); // TODO(agr22): wait for AJAX call and page reload to complete. We should use global state for all AJAX calls to determine if the call is complete
                        //              also we should avoid a page reload after a delete operation allowing us to set a global state.
        List<WebElement> buttonsCell = waitTableElements("list_resource_complete", "name", userName, "0");
        assertEquals(0, buttonsCell.size());

    }
}