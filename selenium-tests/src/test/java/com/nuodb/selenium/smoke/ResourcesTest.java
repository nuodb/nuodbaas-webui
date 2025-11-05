// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.smoke;

import org.junit.jupiter.api.Test;

import com.nuodb.selenium.TestRoutines;

import java.net.MalformedURLException;

public class ResourcesTest extends TestRoutines {
    @Test
    public void testCreateDeleteResources() throws MalformedURLException {
        loginRest();
        String user = createUser();
        String project = createProject();
        String db = createDatabase(project);
        String backup = createBackup(project, db);
        deleteBackup(backup);
        deleteDatabase(db);
        deleteProject(project);
        deleteUser(user);
    }
}