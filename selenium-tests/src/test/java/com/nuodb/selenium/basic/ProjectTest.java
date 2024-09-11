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

public class ProjectTest extends TestRoutines {
    private void clickProjectsMenu() {
        clickMenuItem("projects");
    }

    @Test
    public void testCreateProject() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        createProject();
    }

    @Test
    public void testListCreateAndDeleteProjects() {
        // Setup and list projects
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        clickProjectsMenu();

        // find project and delete
        deleteProject(projectName);

        // verify project is gone
        waitRestComplete();
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", projectName, "0");
        assertEquals(0, buttonsCell.size());

    }

    @Test
    public void testEditProject() {
        // Setup and list projects
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String projectName = createProject();
        clickProjectsMenu();

        // find project and start edit mode
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", projectName, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> editButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='edit_button']"));
        assertEquals(1, editButtons.size());
        editButtons.get(0).click();

        // edit project and save
        replaceInputElementByName("tier", "n0.small");
        waitElement("section-advanced").click();
        waitElement("section-maintenance").click();
        replaceInputElementByName("maintenance.expiresIn", "30d");
        waitElement("create_resource__create_button").click();
        waitRestComplete();

        // verify project was modified
        List<WebElement> tierCells = waitTableElements("list_resource__table", "name", projectName, "tier");
        assertThat(tierCells)
            .hasSize(1)
            .get(0)
            .hasValue("n0.small");

        List<WebElement> maintenanceCells = waitTableElements("list_resource__table", "name", projectName, "maintenance");
            assertThat(maintenanceCells)
                .hasSize(1)
                .get(0)
                .containsValue("2592000000000000ns");
       }
}