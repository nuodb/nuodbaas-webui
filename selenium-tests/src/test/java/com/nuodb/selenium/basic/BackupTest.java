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
        createBackup(projectName, databaseName);
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
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", backupName, "0");
        assertEquals(0, buttonsCell.size());
    }

    @Test
    public void testEditBackup() {
        // Setup and list backups
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        String databaseName = createDatabase(projectName);
        String backupName = createBackup(projectName, databaseName);

        // find backup and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", backupName, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> editButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='edit_button']"));
        assertEquals(1, editButtons.size());
        editButtons.get(0).click();

        // edit backup and save
        waitInputElementByName("labels.key").sendKeys(projectName);
        waitInputElementByName("labels.value").sendKeys(databaseName);
        waitElement("add_button_labels").click();
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify backup was modified
        List<WebElement> labelCells = waitTableElements("list_resource__table", "name", backupName, "labels");
        assertThat(labelCells)
            .hasSize(1)
            .get(0)
            .mapContains(projectName, databaseName);
    }
}