// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.advanced;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

public class SqlTests extends TestRoutines {
    @Test
    public void testSqlPage() {
        login();
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // Wait for Database to become available
        retry(180, 1000, ()->{
            List<WebElement> statusColumn = waitTableElements("list_resource__table", "name", databaseName, "state");
            assertEquals(1, statusColumn.size());
            assertEquals("Available", statusColumn.get(0).getText());
        });

        // Open SQL Editor
        List<WebElement> menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, menuCells.size());
        clickPopupMenu(menuCells.get(0), "button.sql.editor");

        // login to SQL database
        replaceInputElementByName("dbUsername", "dba");
        replaceInputElementByName("dbPassword", "passw0rd");
        replaceInputElementByName("dbSchema", "schema");
        waitElement("sql.login.button").click();
        waitRestComplete();

        // create table with row and show output
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
}