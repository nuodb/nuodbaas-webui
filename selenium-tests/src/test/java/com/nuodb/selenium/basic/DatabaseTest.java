// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

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

public class DatabaseTest extends TestRoutines {
    @Test
    public void testCreateDatabase() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // verify database was created
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
    }

    @Test
    public void testListCreateAndDeleteDatabases() {
        // Setup and list databases
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // find database and delete
        deleteDatabase(databaseName);

        // verify database is gone
        waitRestComplete();
        retry(()->{
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
            assertEquals(0, buttonsCell.size());
        });
    }

    @Test
    public void testEditDatabase() {
        // Setup and list databases
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // find database and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "edit_button");

        // edit database and save
        waitInputElementByName("labels.key").sendKeys(projectName);
        waitInputElementByName("labels.value").sendKeys(databaseName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify database was modified
        retry(()->{
            List<WebElement> labelCells = waitTableElements("list_resource__table", "name", databaseName, "labels");
            assertThat(labelCells)
                .hasSize(1)
                .get(0)
                .mapContains(projectName, databaseName);
        });
   }

   private WebElement findSingleDatabaseButton(String databaseName, String buttonLabel) {
        List<WebElement> statusCell = waitTableElements("list_resource__table", "name", databaseName, "status");
        assertEquals(1, statusCell.size());
        List<WebElement> buttons = statusCell.get(0).findElements(By.tagName("button"));
        assertEquals(1, buttons.size());
        assertEquals(buttonLabel.toLowerCase(), buttons.get(0).getText().toLowerCase());
        return buttons.get(0);
   }

   @Test
   public void testStartStopDatabase() {
       // Setup and list databases
       login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
       String projectName = createProject();
       String databaseName = createDatabase(projectName);

       // perform "Stop Database" action
       List<WebElement> menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
       assertEquals(1, menuCells.size());
       clickPopupMenu(menuCells.get(0), "confirm.stop.database.title");
       waitElement("dialog_button_yes").click();
       waitRestComplete();

       // TODO(agr22) - workaround to refresh view - we're still running on Control Plane 2.6 for this integration test
       clickMenu("projects");
       clickMenu("databases");

       // perform "Start Database" action
       menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
       assertEquals(1, menuCells.size());
       clickPopupMenu(menuCells.get(0), "confirm.start.database.title");
       waitElement("dialog_button_yes").click();
       waitRestComplete();

       // TODO(agr22) - workaround to refresh view - we're still running on Control Plane 2.6 for this integration test
       clickMenu("projects");
       clickMenu("databases");

       // find database and "Stop Database" button
       menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
       assertEquals(1, menuCells.size());
       clickPopupMenu(menuCells.get(0), "confirm.stop.database.title");
       waitElement("dialog_button_no").click();
       waitRestComplete();

  }
}