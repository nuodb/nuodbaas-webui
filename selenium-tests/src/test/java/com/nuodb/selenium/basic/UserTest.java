// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;

import static com.nuodb.selenium.SeleniumAssert.assertThat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.net.MalformedURLException;
import java.util.List;

public class UserTest extends TestRoutines {
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
        clickMenu("users");

        // find user and delete
        deleteUser(userName);

        // verify user is gone
        waitRestComplete();
        retry(()-> {
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, MENU_COLUMN);
            assertEquals(0, buttonsCell.size());
        });
    }

    @Test
    public void testEditUser() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String userName = createUser();
        clickMenu("users");

        // find user and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "edit_button");

        // edit user and save
        waitElement("section-title-labels").click();
        waitInputElementByName("labels.key").sendKeys(userName);
        waitInputElementByName("labels.value").sendKeys(userName);
        waitElement("add_button_labels").click();

        // verify allowCrossOrganizationAccess / organization / name fields are disabled in edit mode
        String [] disabledFields = new String[]{"allowCrossOrganizationAccess", "organization", "name"};
        for(String field : disabledFields ) {
            assertFalse(waitPresentInputElementByName(field).isEnabled(), "\"" + field + "\" field is not disabled");
        }

        // save user
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify user was modified
        retry(()->{
            List<WebElement> labelsCells = waitTableElements("list_resource__table", "name", userName, "labels");
            assertThat(labelsCells)
                .hasSize(1)
                .get(0)
                .mapContains(userName, userName);
        });
   }
}