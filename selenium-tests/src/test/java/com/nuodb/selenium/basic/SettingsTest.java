// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import com.nuodb.selenium.TestRoutines;

import java.net.MalformedURLException;

public class SettingsTest extends TestRoutines {

    @Test
    public void testCancelSave() throws MalformedURLException {
        loginRest();
        clickUserMenu("settings");
        waitElement("button.cancel");
        clickUserMenu("settings");
        waitElement("button.save");
    }
}
