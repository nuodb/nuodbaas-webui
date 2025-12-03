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
        loginRest();
        String projectName = createProjectRest();
        String databaseName = createDatabase(projectName);

        // verify database was created
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
    }

    @Test
    public void testListCreateAndDeleteDatabases() {
        // Setup and list databases
        loginRest();
        String projectName = createProjectRest();
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
        loginRest();
        String projectName = createProjectRest();
        String databaseName = createDatabaseRest(projectName);

        // find database and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "edit_button");

        // edit database and save
        waitElement("section-title-advanced").click();
        waitInputElementByName("labels.key").sendKeys(projectName);
        waitInputElementByName("labels.value").sendKeys(databaseName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__save_button").click();
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
    public void testChangeDatabasePassword() {
        // Setup and list databases
        loginRest();
        String projectName = createProjectRest();
        String databaseName = createDatabaseRest(projectName);

        // find database and start edit mode
        clickMenu(Resource.databases.name());
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "edit_button");

        // validate cancel button in Change Password dialog
        waitElement("button.changePassword").click();
        waitElement("button.cancel").click();

        // change password for the first time
        waitElement("button.changePassword").click();
        waitInputElementByName("oldPassword").sendKeys("passw0rd");
        waitInputElementByName("newPassword1").sendKeys("db1");
        waitInputElementByName("newPassword2").sendKeys("db1");
        waitElement("dialog.button.changePassword").click();
        waitRestComplete();

        // change password for the second time (to validate it changed before)
        waitElement("button.changePassword").click();
        waitInputElementByName("oldPassword").sendKeys("db1");
        waitInputElementByName("newPassword1").sendKeys("passw0rd");
        waitInputElementByName("newPassword2").sendKeys("passw0rd");
        waitElement("dialog.button.changePassword").click();
        waitRestComplete();
        waitElement("button.changePassword");
   }

   @Test
   public void testStartStopDatabase() {
       // Setup and list databases
       loginRest();
       String projectName = createProjectRest();
       String databaseName = createDatabaseRest(projectName);

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

    @Test
    public void testDatabaseViewPopupMenu() {
        // Setup and list databases
        loginRest();
        String projectName = createProjectRest();
        String databaseName = createDatabaseRest(projectName);

        // find database and start view mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "view_button");

        // Cancel out of view mode
        waitElement("create_resource__close_button").click();

        // open view mode a second time to evaluate popup menu
        buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "view_button");

        // click "Edit" button and validate new state and cancel out of edit mode
        waitElement("edit_button").click();
        waitElement("create_resource__save_button");
        waitElement("create_resource__cancel_button").click();

        // check popup menu
        waitElement("resource-popup-menu").click();
        waitElement("popupmenu-edit_button").click();
        waitElement("create_resource__cancel_button").click();

        waitElement("resource-popup-menu").click();
        waitElement("popupmenu-delete_button").click();
        waitElement("dialog_button_no").click();

        waitElement("resource-popup-menu").click();
        waitElement("popupmenu-button.db.connection.info").click();
        waitElement("dialog_button_ok").click();

        waitElement("resource-popup-menu").click();
        waitElement("popupmenu-confirm.stop.database.title").click();
        waitElement("dialog_button_no").click();

        waitElement("resource-popup-menu").click();
        waitElement("popupmenu-button.sql.editor");
   }
}