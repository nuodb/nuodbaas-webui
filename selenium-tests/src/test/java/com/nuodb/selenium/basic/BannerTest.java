// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;

import java.net.MalformedURLException;
import java.util.Arrays;
import java.util.List;

public class BannerTest extends TestRoutines {
    public static List<String> expectedMenuItems = Arrays.asList("backuppolicies", "backups", "databases", "projects", "users");

    @Test
    public void testHorizontalBanner() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);

        // get all the menu item labels
        List<String> menuItems = getTextList("menu-button-", expectedMenuItems.size());
        for(int i=0; i<menuItems.size(); i++) {
            menuItems.set(i, menuItems.get(i).toLowerCase());
        }
        Assertions.assertTrue(menuItems.containsAll(expectedMenuItems), "Expected: " + expectedMenuItems + ", Actual: " + menuItems);
    }

    @Test
    public void testMenuBanner() throws MalformedURLException {
        setWindowSize(500, 800);
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        click("menu-appbar");

        // get all the menu item labels
        List<String> menuItems = getTextList("menu-label-", expectedMenuItems.size());
        Assertions.assertTrue(menuItems.containsAll(expectedMenuItems), "Expected: " + expectedMenuItems + ", Actual: " + menuItems);
    }
}