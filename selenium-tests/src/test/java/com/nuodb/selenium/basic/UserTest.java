package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.SeleniumTestHelper;
import static com.nuodb.selenium.SeleniumAssert.assertThat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.MalformedURLException;
import java.util.List;

public class UserTest extends SeleniumTestHelper {
    public void clickUsersMenu() {
        findElementFromList("menu-button-", "users").click();
    }

    private String createUser() {
        String name = "user" + System.currentTimeMillis();
        clickUsersMenu();
        waitElement("list_resource__complete");
        WebElement createButton = waitElement("list_resource__create_button");
        createButton.click();
        waitInputElementByName("organization").sendKeys("acme");
        waitInputElementByName("name").sendKeys(name);
        waitInputElementByName("password").sendKeys("passw0rd");
        waitInputElementByName("accessRule.allow.0").sendKeys("all:acme");
        waitElement("create_resource__create_button").click();
        waitElement("list_resource__complete");

        return name;
    }

    private void deleteUser(String userName) {
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> deleteButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='delete_button']"));
        assertEquals(1, deleteButtons.size());
        deleteButtons.get(0).click();
    }

    @Test
    public void testCreateUser() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String name = createUser();
        deleteUser(name);
    }

    @Test
    public void testListCreateAndDeleteUsers() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String userName = createUser();
        clickUsersMenu();
        waitElement("list_resource__complete");

        // find user and delete
        deleteUser(userName);

        // verify user is gone
        waitElement("list_resource__complete");
        sleep(1000); // TODO(agr22): wait for AJAX call and page reload to complete. We should use global state for all AJAX calls to determine if the call is complete
                        //              also we should avoid a page reload after a delete operation allowing us to set a global state.
        List<WebElement> buttonsCell = waitTableElements("list_resource__complete", "name", userName, "0");
        assertEquals(0, buttonsCell.size());

    }

    @Test
    public void testEditUser() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String userName = createUser();
        clickUsersMenu();
        waitElement("list_resource__complete");

        // find user and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> editButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='edit_button']"));
        assertEquals(1, editButtons.size());
        editButtons.get(0).click();

        // edit user and save
        waitInputElementByName("labels.key").sendKeys(userName);
        waitInputElementByName("labels.value").sendKeys(userName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__create_button").click();
        waitElement("list_resource__complete");

        // verify user was modified
        List<WebElement> labelsCells = waitTableElements("list_resource__table", "name", userName, "labels");
        assertThat(labelsCells)
            .hasSize(1)
            .get(0)
            .mapContains(userName, userName);

        // Delete User
        deleteUser(userName);
    }
}