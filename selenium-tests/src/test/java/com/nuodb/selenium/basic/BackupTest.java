// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.
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

public class BackupTest extends TestRoutines {
    @Test
    public void testCreateBackup() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);
        String backupName = createBackup(projectName, databaseName);

        // verify that backup was created
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", backupName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
    }

    @Test
    public void testListCreateAndDeleteBackups() {
        // Setup and list Backups
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);
        String backupName = createBackup(projectName, databaseName);

        // find backup and delete
        deleteBackup(backupName);

        // verify backup is gone
        waitRestComplete();
        retry(()->{
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", backupName, MENU_COLUMN);
            assertEquals(0, buttonsCell.size());
        });
    }

    @Test
    public void testEditBackup() {
        // Setup and list backups
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);
        String backupName = createBackup(projectName, databaseName);

        // find backup and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", backupName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "edit_button");

        // edit backup and save
        waitElement("section-title-advanced").click();
        sleep(200); // wait for section to expand
        waitInputElementByName("labels.key").sendKeys(projectName);
        waitInputElementByName("labels.value").sendKeys(databaseName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify backup was modified
        retry(()->{
            List<WebElement> labelCells = waitTableElements("list_resource__table", "name", backupName, "labels");
            assertThat(labelCells)
                .hasSize(1)
                .get(0)
                .mapContains(projectName, databaseName);
        });
    }
}