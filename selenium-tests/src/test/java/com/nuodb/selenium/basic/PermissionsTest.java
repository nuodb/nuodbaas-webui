// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

public class PermissionsTest extends TestRoutines {
    @Test
    public void testReadEverything() {
        // Setup
        login();
        String project = createProject();
        clickUserMenu("logout");
        createAndLoginUser("read:" + TEST_ORGANIZATION, null, null, null);

        // Validate access to all resources
        hasMenu("projects");
        hasMenu("databases");
        hasMenu("backups");
        hasMenu("backuppolicies");
        hasMenu("users");

        // No create button on users and projects views
        clickMenu("users");
        hasNotElement("list_resource__create_button_users", 1000);
        clickMenu("projects");
        hasNotElement("list_resource__create_button_projects", 1000);

        // In Project view's row: No "Edit" popup menu item and presence of "View" popup menu item
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", project, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        hasNotPopupMenu(buttonsCell.get(0), "edit_button");
        clickPopupMenu(buttonsCell.get(0), "view_button");

        // in project entry view, have "show databases" menu item and no "edit" menu item
        waitElement("resource-popup-menu").click();
        hasElement("popupmenu-button.show.databases");
        hasNotElement("popupmenu-edit_button", 1000);
    }

    @Test
    public void testReadProjectsUsers() {
        // Setup
        createAndLoginUser("read:/projects/" + TEST_ORGANIZATION + "/*", "read:/users/" + TEST_ORGANIZATION + "/*", null, null);

        // Check visibility of projects and users view
        hasMenu("projects");
        hasMenu("users");

        // check no presence of other views
        hasNotMenu("databases", 500);
        hasNotMenu("backups", 500);
        hasNotMenu("backupPolicies", 500);
    }

    @Test
    public void testReadEverythingWriteUsers() {
        // Setup
        createAndLoginUser("read:" + TEST_ORGANIZATION, "write:/users/" + TEST_ORGANIZATION, null, null);

        // Check we cannot write projects
        clickMenu("projects");
        hasNotElement("list_resource__create_button_projects", 1000);

        // Check we can write users
        clickMenu("users");
        hasElement("list_resource__create_button_users");
    }

    @Test
    public void testWriteEverythingExceptUsers() {
        // Setup
        createAndLoginUser("all:" + TEST_ORGANIZATION, null, "write:/users/" + TEST_ORGANIZATION, null);

        // Check we can write projects
        clickMenu("projects");
        hasElement("list_resource__create_button_projects");

        // Check we cannot write users
        clickMenu("users");
        hasNotElement("list_resource__create_button_users", 1000);
    }

    @Test
    public void testUserWithRoleOrgAdmin() {
        // Setup
        login();
        String user = shortUnique("u");
        List<String> params = new ArrayList<>();
        params.add("organization");
        params.add(TEST_ORGANIZATION);
        params.add("name");
        params.add(user);
        params.add("password");
        params.add(TEST_ADMIN_PASSWORD);
        params.add("accessRule.allow.0");
        params.add("read:integrationtest");
        params.add("roles.0.name");
        params.add("organization-admin");
        params.add("roles.0.params.organization");
        params.add(TEST_ORGANIZATION);
        createResourceRest(Resource.users, user, params.toArray(new String[0]));
        clickUserMenu("logout");
        login(TEST_ORGANIZATION, user, TEST_ADMIN_PASSWORD);

        // Check we can write projects
        clickMenu("projects");
        hasElement("list_resource__create_button_projects");

        // Check we can read servicetiers
        clickMenu("cluster/servicetiers");

        // Check we can read helmfeatures
        clickMenu("cluster/helmfeatures");

        // Check we cannot read canaryrollouts
        hasNotMenu("cluster/canaryrollouts", 1000);
    }

    private String createAndLoginUser(String allow0, String allow1, String deny0, String deny1) {
        login();
        String user = createUser(allow0, allow1, deny0, deny1);
        clickUserMenu("logout");
        login(TEST_ORGANIZATION, user, TEST_ADMIN_PASSWORD);
        return user;
    }

}