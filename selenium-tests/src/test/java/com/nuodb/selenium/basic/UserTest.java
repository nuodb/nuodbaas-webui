package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;

import static com.nuodb.selenium.SeleniumAssert.assertThat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.MalformedURLException;
import java.util.List;

public class UserTest extends TestRoutines {
    public void clickUsersMenu() {
        clickMenuItem("users");
    }

    @Test
    public void testCreateUser() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        createUser();
    }

    @Test
    public void testListCreateAndDeleteUsers() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String userName = createUser();
        clickUsersMenu();

        // find user and delete
        deleteUser(userName);

        // verify user is gone
        waitRestComplete();
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, "0");
        assertEquals(0, buttonsCell.size());
    }

    @Test
    public void testEditUser() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String userName = createUser();
        clickUsersMenu();

        // find user and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> editButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='edit_button']"));
        assertEquals(1, editButtons.size());
        editButtons.get(0).click();

        // edit user and save
        waitElement("section-labels").click();
        waitInputElementByName("labels.key").sendKeys(userName);
        waitInputElementByName("labels.value").sendKeys(userName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify user was modified
        List<WebElement> labelsCells = waitTableElements("list_resource__table", "name", userName, "labels");
        assertThat(labelsCells)
            .hasSize(1)
            .get(0)
            .mapContains(userName, userName);
   }
}