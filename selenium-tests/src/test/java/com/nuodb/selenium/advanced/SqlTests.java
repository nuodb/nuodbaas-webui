// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.advanced;

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
    public static void run(String[] args) {
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

    @Test
    public void testSqlPage() {
        login();
        String projectName = createProject();
        String databaseName = createDatabase(projectName);

        // Wait for Database to become available
        final AtomicInteger count = new AtomicInteger(0);
        retry(180, 1000, ()->{
            if(count.incrementAndGet() == 179) {
                run(new String[]{"bash","-c","pwd"});
                run(new String[]{"../bin/kubectl","describe","all","-A"});
                run(new String[]{"../bin/kubectl","get","all","-A"});
            }
            List<WebElement> statusColumn = waitTableElements("list_resource__table", "name", databaseName, "state");
            assertEquals(1, statusColumn.size());
            assertEquals("Available", statusColumn.get(0).getText());
        });

        // Open SQL Editor
        List<WebElement> menuCells = waitTableElements("list_resource__table", "name", databaseName, MENU_COLUMN);
        assertEquals(1, menuCells.size());
        clickPopupMenu(menuCells.get(0), "button.sql.editor");

        sleep(5000);

        // login to SQL database
        replaceInputElementByName("dbUsername", "dba");
        replaceInputElementByName("dbPassword", "passw0rd");
        replaceInputElementByName("dbSchema", "schema");
        waitElement("sql.login.button").click();
        waitRestComplete();

        sleep(5000);

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