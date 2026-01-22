// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.advanced;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class SqlTests extends TestRoutines {
    public static final String KUBECTL_BIN = "../bin/kubectl";
    public static final String DB_USERNAME = "dba";
    public static final String DB_PASSWORD = "passw0rd";
    public static final String DB_SCHEMA = "schema";

    private static String projectName = null;
    private static String databaseName = null;

    public static void run(String ...args) {
        try {
            Process process = Runtime.getRuntime().exec(args);
            BufferedReader stdInput = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String s = null;
            System.out.println("Standard output:");
            while ((s = stdInput.readLine()) != null) {
                System.out.println(s);
            }
            BufferedReader stdError = new BufferedReader(new InputStreamReader(process.getErrorStream()));
            System.out.println("Standard error:");
            while ((s = stdError.readLine()) != null) {
                System.out.println(s);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @BeforeEach
    private void beforeEach() {
        loginRest();
        if(projectName == null || databaseName == null) {
            if("true".equals(System.getenv("CI_BUILD"))) {
                projectName = createProjectRest();
                databaseName = createDatabaseRest(projectName);
            }
            else {
                // in development environment we want to create the database only once
                // to allow for running tests multiple times without the need to re-create the database
                projectName = createProjectRestIfNotFound("manualproject");
                databaseName = createDatabaseRestIfNotFound("manualproject", "manualdb1");
            }

            // Wait for Database to become available
            final AtomicInteger count = new AtomicInteger(0);
            retry(180, 1000, ()->{
                if(count.incrementAndGet() == 179) {
                    run("bash", "-c", "pwd");
                    run(KUBECTL_BIN, "describe", "all", "-A");
                    run(KUBECTL_BIN, "describe", "pvc", "-A");
                    run(KUBECTL_BIN, "describe", "pv", "-A");
                    run(KUBECTL_BIN, "describe", "nodes", "-A");
                    run(KUBECTL_BIN, "get", "all", "-A");
                    run(KUBECTL_BIN, "get", "pvc", "-A");
                    run(KUBECTL_BIN, "get", "pv", "-A");
                    run(KUBECTL_BIN, "get", "nodes", "-A");
                }
                clickMenu(Resource.projects.name());
                clickMenu(Resource.databases.name());
                List<WebElement> statusColumn = waitTableElements("list_resource__table", "name", databaseName, "state");
                assertEquals(1, statusColumn.size());
                assertEquals("Available", statusColumn.get(0).getText());
            });
        }
    }

    private void loginSqlEditor() {
        // Open SQL Editor
        clickMenu(Resource.databases.name());
        List<WebElement> menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, menuCells.size());
        clickPopupMenu(menuCells.get(0), "button.sql.editor");

        // login to SQL database
        replaceInputElementByName("dbUsername", DB_USERNAME);
        replaceInputElementByName("dbPassword", DB_PASSWORD);
        replaceInputElementByName("dbSchema", DB_SCHEMA);
        waitElement("sql.login.button").click();
        waitRestComplete();
    }

    @Test
    public void testSqlPage() {
        loginSqlEditor();

        // create table with row and show output
        waitElement("query").click();
        replaceInputElementByName("sqlQuery", "create table table1 (name VARCHAR(80))");
        waitElement("submitSql").click();
        waitRestComplete();

        replaceInputElementByName("sqlQuery", "insert into table1 (name) values ('abc')");
        waitElement("submitSql").click();
        waitRestComplete();

        replaceInputElementByName("sqlQuery", "select * from table1");
        waitElement("submitSql").click();
        waitRestComplete();

        // export all tables
        waitElement("export").click();
        waitElement("perform.export").click();
        retry(10, 500, ()->{
            assertEquals(waitElement("export.status.button").getText(), "Dismiss");
        });
        waitElement("export.status.button").click();

        String downloadedFile = getLocalStorage("downloadedFile");
        assertTrue(downloadedFile.contains("('abc')"));
   }

    @Test
    public void testSqlUsersLocal() {
        loginSqlEditor();

        // Select Users tab
        waitElement("users").click();

        // ensure Cancel button works in the "New User" dialog
        waitElement("sql-add-button").click();
        waitElement("dialog_button_cancel").click();

        // open "local user" dialog and cancel out
        waitElement("sql-add-button").click();
        waitElement("dialog_button_local").click();
        waitInputElementByName("username");
        waitElement("dialog_button_cancel").click();

        // open "local user" dialog and create user with all permissions
        String dbUser = shortUnique("db");
        waitElement("sql-add-button").click();
        waitElement("dialog_button_local").click();
        waitInputElementByName("username").sendKeys(dbUser);
        waitInputElementByName("password").sendKeys("passw0rd");
        waitElement("user-roles-system.dba").click();
        waitElement("user-roles-system.administrator").click();
        waitElement("grant-option-system.dba").click();
        waitElement("grant-option-system.administrator").click();
        waitElement("dialog_button_save").click();
        waitRestComplete();

        verifyAndDeleteDbUser(dbUser);
    }

    private void verifyAndDeleteDbUser(String user) {
        // verify user exists
        List<WebElement> users = waitTableElements("table_sql", "Username", user, MENU_COLUMN);
        assertEquals(1, users.size());

        // verify values in edit dialog
        clickPopupMenu(users.get(0), "edit_button");
        assertEquals(user, waitInputElementByName("username").getAttribute("value"));
        assertEquals(true, waitElement("user-roles-system.dba").isSelected());
        assertEquals(true, waitElement("user-roles-system.administrator").isSelected());
        assertEquals(true, waitElement("grant-option-system.dba").isSelected());
        assertEquals(true, waitElement("grant-option-system.administrator").isSelected());
        waitElement("dialog_button_cancel").click();

        // delete user (first cancel and then delete)
        clickPopupMenu(users.get(0), "delete_button");
        waitElement("dialog_button_no").click();
        clickPopupMenu(users.get(0), "delete_button");
        waitElement("dialog_button_yes").click();
        waitRestComplete();

        //ensure user is deleted
        users = waitTableElements("table_sql", "Username", user, MENU_COLUMN);
        assertEquals(0, users.size());
    }

    @Test
    public void testSqlUsersDbaas() {
        String dbaasUser = createUser();
        loginSqlEditor();

        // Select Users tab
        waitElement("users").click();

        // open "dbaas user" dialog and cancel out
        waitElement("sql-add-button").click();
        waitElement("dialog_button_dbaas").click();
        replaceInputElementByName("username", TEST_ORGANIZATION + "/" + dbaasUser);
        waitElement("dialog_button_cancel").click();

        // open "dbaas user" dialog and create user with all permissions
        waitElement("sql-add-button").click();
        waitElement("dialog_button_dbaas").click();
        replaceInputElementByName("username", TEST_ORGANIZATION + "/" + dbaasUser);
        waitElement("user-roles-system.dba").click();
        waitElement("user-roles-system.administrator").click();
        waitElement("grant-option-system.dba").click();
        waitElement("grant-option-system.administrator").click();
        waitElement("dialog_button_save").click();
        waitRestComplete();

        verifyAndDeleteDbUser(TEST_ORGANIZATION + "_" + dbaasUser);
    }

}