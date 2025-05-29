// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static com.nuodb.selenium.SeleniumAssert.assertThat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.MalformedURLException;
import java.util.List;

public class ProjectTest extends TestRoutines {
    @Test
    public void testCreateProject() throws MalformedURLException {
        login();
        createProject();
    }

    @Test
    public void testListCreateAndDeleteProjects() {
        // Setup and list projects
        login();
        String projectName = createProject();
        clickMenu("projects");

        // find project and delete
        deleteProject(projectName);

        // verify project is gone
        waitRestComplete();
        retry(30, 1000, ()->{
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", projectName, MENU_COLUMN);
            assertEquals(0, buttonsCell.size());
        });

    }

    @Test
    public void testEditProject() {
        // Setup and list projects
        login();
        String projectName = createProject();

        // resource versions are getting updated in the background a few times by the control plane / operator preventing an update later.
        retry(10, 1000, ()->{
            clickMenu("projects");
            // find project and start edit mode
            List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", projectName, MENU_COLUMN);
            assertEquals(1, buttonsCell.size());
            clickPopupMenu(buttonsCell.get(0), "edit_button");

            // edit project and save
            replaceInputElementByName("tier", "n0.small");
            waitElement("section-title-advanced").click();
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
        });
    }
}