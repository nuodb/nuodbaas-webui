// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import com.google.common.collect.ImmutableList;
import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;

import java.net.MalformedURLException;
import java.util.List;

public class BannerTest extends TestRoutines {
    public static final List<String> expectedMenuItems = ImmutableList.of("backuppolicies", "backups", "databases", "projects", "users");

    @Test
    public void testMenuBanner() throws MalformedURLException {
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);

        // make sure all menu items are present
        for(String menuItem : expectedMenuItems) {
            waitElement("menu-button-" + menuItem);
        }
    }

}