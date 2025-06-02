// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

public class SqlTest extends TestRoutines {
    private static String projectName;
    private static String databaseName;

    @BeforeAll
    public static void createAvailableDatabase() {
        TestRoutines tr = new TestRoutines();
        tr.login();
        projectName = tr.createProject();
        databaseName = tr.createDatabase(projectName);

        // verify database was created
        List<WebElement> buttonsCell = tr.waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());

        // wait for database to become available
        tr.retry(60, 1000, ()-> {
            List<WebElement> stateCell = tr.waitTableElements("list_resource__table", "name", databaseName, "state");
            assertEquals(1, stateCell.size());
            assertEquals("Available", stateCell.get(0).getText());
        });
    }

    @Test
    public void testCreateTable() {
        login();

        // login to SQL Editor
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, buttonsCell.size());
        clickPopupMenu(buttonsCell.get(0), "button.sql.editor");
        waitInputElementByName("dbUsername").sendKeys("dba");
        waitInputElementByName("dbPassword").sendKeys("passw0rd");
        waitInputElementByName("dbSchema").sendKeys("schema" + Keys.RETURN);

        // Setup table and a few entries
        WebElement sqlQuery = waitInputElementByName("sqlQuery");
        sqlQuery.sendKeys("value", "");
        sqlQuery.sendKeys("create table table1 (name VARCHAR(80)); insert into table1 (name) values ('ABC'),('DEF'),('GHI')" + Keys.RETURN);
    }
}