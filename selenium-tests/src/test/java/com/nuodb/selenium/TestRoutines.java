package com.nuodb.selenium;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.openqa.selenium.By;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebElement;

public class TestRoutines extends SeleniumTestHelper {

    Map<Resource, Set<String>> createdResources = new HashMap<>();

    @AfterEach
    public void after() {
        // clean up all the created resources
        for(int i=Resource.values().length-1; i >= 0; i--) {
            Resource resource = Resource.values()[i];
            Set<String> names = createdResources.get(resource);
            if(names != null) {
                for(String name : names) {
                    try {
                        deleteResource(resource, name);
                    }
                    catch(Throwable e) {
                        // don't fail test on resource clean up
                        System.err.println("unable to delete resource " + resource.name() + " with name " + name);
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    /* keep in right order - it deletes the resources from the bottom up */
    private enum Resource {
        users,
        projects,
        databases,
        backups
    }

    /**
     * Creates shortened unique resource name based on system time
     * Algorithm: take current time of last 30 days in 10ms granularity and Base36 encode
     *            to provide a valid resource name. Prepend with the prefix
     * @param prefix if null, use "s"
     * @return shortened unique name
     */
    private String shortUnique(String prefix) {
        final String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder();
        if(prefix == null) {
            sb.append("s");
        }
        else {
            sb.append(prefix);
        }
        int value = (int)(System.currentTimeMillis() % (30*24*3600*1000))/10;
        while(value > 0) {
            sb.append(chars.charAt(value % 36));
            value = value / 36;
        }
        return sb.toString();
    }
    public void clickMenuItem(String item) {
        final int maxRetries = 3;
        for(int retry=0; retry<3; retry++) {
            try {
                findElementFromList("menu-button-", item).click();
                break;
            }
            catch(StaleElementReferenceException e) {
                if(retry+1 == maxRetries) {
                    throw e;
                }
            }
        }
        waitRestComplete();
    }

    public void waitRestComplete() {
        waitElement("rest_spinner__complete");
    }

    private void createResource(Resource resource, String name, String ...fieldValueList) {
        clickMenuItem(resource.name());

        WebElement createButton = waitElement("list_resource__create_button");
        createButton.click();
        for (int i=0; i<fieldValueList.length; i += 2) {
            waitInputElementByName(fieldValueList[i]).sendKeys(fieldValueList[i+1]);
        }
        waitElement("create_resource__create_button").click();
        createdResources.computeIfAbsent(resource, n -> new HashSet<String>()).add(name);
        waitRestComplete();
    }

    public void deleteResource(Resource resource, String name) {
        clickMenuItem(resource.name());
        List<WebElement> buttonsCell = waitTableElements("list_resource__table", "name", name, "0");
        assertEquals(1, buttonsCell.size());
        List<WebElement> deleteButtons = buttonsCell.get(0).findElements(By.xpath("button[@data-testid='delete_button']"));
        assertEquals(1, deleteButtons.size());
        deleteButtons.get(0).click();
        createdResources.get(resource).remove(name);
    }

    public String createUser() {
        String name = shortUnique("u");
        createResource(Resource.users, name,
            "organization", "acme",
            "name", name,
            "password", "passw0rd",
            "accessRule.allow.0", "all:acme"
        );
        return name;
    }

    public void deleteUser(String userName) {
        deleteResource(Resource.users, userName);
    }

    public String createProject() {
        String name = shortUnique("p");
        createResource(Resource.projects, name,
            "organization", "acme",
            "name", name,
            "sla", "dev",
            "tier", "n0.nano"
        );
        return name;
    }

    public void deleteProject(String projectName) {
        deleteResource(Resource.projects, projectName);
    }

    public String createDatabase(String projectName) {
        String name = shortUnique("d");
        createResource(Resource.databases, name,
            "organization", "acme",
            "project", projectName,
            "name", name,
            "dbaPassword", "passw0rd"
        );
        return name;
    }

    public void deleteDatabase(String databaseName) {
        deleteResource(Resource.databases, databaseName);
    }

    public String createBackup(String projectName, String databaseName) {
        String name = shortUnique("b");
        createResource(Resource.backups, name,
            "organization", "acme",
            "project", projectName,
            "database", databaseName,
            "name", name
        );
        return name;
    }

    public void deleteBackup(String backupName) {
        deleteResource(Resource.backups, backupName);
    }
}
