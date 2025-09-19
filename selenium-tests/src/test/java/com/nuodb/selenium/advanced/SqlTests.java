// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.advanced;

import org.junit.jupiter.api.Disabled;
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

    @Disabled("TODO: this fails because the NuoDBaaS-SQL service is not loaded on CircleCI")
    @Test
    public void testSqlPage() {
        login();
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // Wait for Database to become available
        final AtomicInteger count = new AtomicInteger(0);
        retry(180, 1000, ()->{
            if(count.incrementAndGet() == 179) {
                run("bash", "-c", "pwd");
                run(KUBECTL_BIN, "describe", "all", "-A");
                run(KUBECTL_BIN, "get", "all", "-A");
            }
            List<WebElement> statusColumn = waitTableElements("list_resource__table", "name", databaseName, "state");
            assertEquals(1, statusColumn.size());
            assertEquals("Available", statusColumn.get(0).getText());
        });

        // Open SQL Editor
        List<WebElement> menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, menuCells.size());
        clickPopupMenu(menuCells.get(0), "button.sql.editor");

        // login to SQL database
        replaceInputElementByName("dbUsername", DB_USERNAME);
        replaceInputElementByName("dbPassword", DB_PASSWORD);
        replaceInputElementByName("dbSchema", DB_SCHEMA);
        waitElement("sql.login.button").click();
        waitRestComplete();

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
}