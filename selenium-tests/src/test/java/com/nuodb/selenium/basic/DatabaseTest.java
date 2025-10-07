// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static com.nuodb.selenium.SeleniumAssert.assertThat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.List;

public class DatabaseTest extends TestRoutines {
    @Test
    public void testCreateDatabase() throws MalformedURLException {
        login();
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // verify database was created
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
    }

    @Test
    public void testListCreateAndDeleteDatabases() {
        // Setup and list databases
        login();
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
        login();
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // find database and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "edit_button");

        // edit database and save
        waitElement("section-title-advanced").click();
        waitInputElementByName("labels.key").sendKeys(projectName);
        waitInputElementByName("labels.value").sendKeys(databaseName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify database was modified
        retry(()->{
            List<WebElement> labelCells = waitTableElements("list_resource__table", "name", databaseName, "labels");
            assertThat(labelCells).hasSize(1);
            String text = labelCells.get(0).getText();
            assertEquals(projectName + ": " + databaseName, text);
        });
   }

   @Test
   public void testStartStopDatabase() {
       // Setup and list databases
       login();
       String projectName = createProject();
       String databaseName = createDatabase(projectName);

       // perform "Stop Database" action
       List<WebElement> menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
       assertEquals(1, menuCells.size());
       clickPopupMenu(menuCells.get(0), "confirm.stop.database.title");
       waitElement("dialog_button_yes").click();
       waitRestComplete();

       // perform "Start Database" action
       ArrayList<List<WebElement>> menuCells1 = new ArrayList<>();
       retry(60, 1000, ()->{
            clickMenu(Resource.projects.name());
            clickMenu(Resource.databases.name());
            menuCells1.clear();
            menuCells1.add(waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN));
            assertEquals(1, menuCells1.get(0).size());
            clickPopupMenu(menuCells1.get(0).get(0), "confirm.start.database.title");
        });
         waitElement("dialog_button_yes").click();
         waitRestComplete();

       // find database and "Stop Database" button
       retry(60,1000,()->{
            clickMenu(Resource.projects.name());
            clickMenu(Resource.databases.name());
            menuCells1.clear();
            menuCells1.add(waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN));
            assertEquals(1, menuCells1.get(0).size());
            clickPopupMenu(menuCells1.get(0).get(0), "confirm.stop.database.title");
        });
       waitElement("dialog_button_no").click();
       waitRestComplete();

  }
}