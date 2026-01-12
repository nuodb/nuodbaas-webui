// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static com.nuodb.selenium.SeleniumAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class UserTest extends TestRoutines {
    @Test
    public void testCreateUser() throws MalformedURLException {
        loginRest();
        createUser();
    }

    @Test
    public void testListCreateAndDeleteUsers() {
        // Setup and list users
        loginRest();
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
        loginRest();
        String userName = createUser();
        clickMenu("users");

        // find user and start edit mode
        retry(()->{
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, MENU_COLUMN);
            assertEquals(1, buttonsCell.size());
            clickPopupMenu(buttonsCell.get(0), "edit_button");
        });

        // verify allowCrossOrganizationAccess / organization / name fields are disabled in edit mode
        String [] disabledFields = new String[]{"allowCrossOrganizationAccess", "organization", "name"};
        for(String field : disabledFields ) {
            assertFalse(waitPresentInputElementByName(field).isEnabled(), "\"" + field + "\" field is not disabled");
        }

        // edit user and save
        waitElement("section-title-labels").click();
        waitInputElementByName("labels.0.key").sendKeys(userName);
        waitInputElementByName("labels.0.value").sendKeys(userName);

        // save user
        waitElement("create_resource__save_button").click();
        waitRestComplete();

        // verify user was modified
        retry(()->{
            List<WebElement> labelsCells = waitTableElements("list_resource__table", "name", userName, "labels");
            assertThat(labelsCells).hasSize(1);
            String text = labelsCells.get(0).getText();
            assertEquals(userName + ": " + userName, text);
        });
   }

    @Test
    public void testEditUserRoles() {
        // Setup and list users
        loginRest();
        String projectName = createProjectRest();
        String databaseName = createDatabase(projectName);
        String userName = createUser();
        clickMenu("users");

        // find user and start edit mode
        retry(()->{
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", userName, MENU_COLUMN);
            assertEquals(1, buttonsCell.size());
            clickPopupMenu(buttonsCell.get(0), "edit_button");
        });

        // edit user roles and save
        String[] paramKeys = new String[]{"database","organization","project"};
        waitElement("section-title-advanced").click();
        replaceInputElementByName("roles.0.name", "database-admin");
        List<String> keys = new ArrayList<>();
        for(int i=0; i<paramKeys.length; i++) {
            String key = waitInputElementByName("roles.0.params." + i + ".key").getText();
            keys.add(key);
            String value = TEST_ORGANIZATION;
            if("database".equals(key)) {
                value = databaseName;
            }
            else if("project".equals(key)) {
                value = projectName;
            }
            waitInputElementByName("roles.0.params." + i + ".value").sendKeys(value);
        }
        Collections.sort(keys);
        assertArrayEquals(paramKeys, keys.toArray(new String[0]));

        // save user
        waitElement("create_resource__save_button").click();
        waitRestComplete();

        // verify user was modified
        retry(()->{
            List<WebElement> rolesCells = waitTableElements("list_resource__table", "name", userName, "roles");
            assertThat(rolesCells).hasSize(1);
            String text = rolesCells.get(0).getText();
            assertEquals("name\n" + //
                                "database-admin\n" + //
                                "params\n" + //
                                "database\n" + //
                                databaseName + "\n" + //
                                "organization\n" + //
                                "integrationtest\n" + //
                                "project\n" + //
                                projectName, text);
        });
   }
}