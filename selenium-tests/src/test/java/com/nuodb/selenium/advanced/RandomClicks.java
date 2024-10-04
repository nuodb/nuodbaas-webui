// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.
package com.nuodb.selenium.advanced;

import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;
import com.nuodb.selenium.basic.BannerTest;

public class RandomClicks extends TestRoutines {

    @Test
    public void testRandomClicks() {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        for(int i=0; i<3; i++) {
            String projectName = createProject();
            String databaseName = createDatabase(projectName);
            createBackup(projectName, databaseName);
        }

        // Verify client doesn't produce a call stack by quickly clicking around (async reload issues)
        long start = System.currentTimeMillis();
        while(System.currentTimeMillis() - start < 30*1000) {
            // get all the menu items
            List<String> menuItems = getTextList("menu-button-", BannerTest.expectedMenuItems.size());

            assertNotEquals(0, menuItems.size());

            int index = (int)(Math.random()*menuItems.size());
            waitElement("menu-button-" + index).click();
        }
    }
}