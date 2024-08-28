package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.MalformedURLException;
import java.util.List;

public class SearchTest extends TestRoutines {
    public void clickUsersMenu() {
        clickMenuItem("users");
    }

    @Test
    public void testSearch() throws MalformedURLException {
        String body = """
            {"organization":"acme",
                "name": "%%%NAME%%%",
                "password": "passw0rd",
                "accessRule": {"allow": "all:acme"},
                "labels": {
                    "label1": "value1",
                    "label2": "%%%VALUE2%%%"
                }
            }
        """;

        // Setup users
        String name = shortUnique("u");
        for(int i=10; i<=99; i++) {
            System.out.println("Creating user /acme/" + (name + i));
            createResourceRest(Resource.users, "/acme/" + (name + i), body.replaceAll("%%%NAME%%%", name + i).replaceAll("%%%VALUE2%%%", (name + (i%10))));
        }

        // verify we have full page of users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        clickUsersMenu();
        waitRestComplete();
        List<WebElement> nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(20, nameCell.size());

        // search users starting with "1" index and check that 10 users are returned
        replaceInputElementByName("search", name + "1");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(10, nameCell.size());

        // search users by label existence
        replaceInputElementByName("search", "label=label1");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(20, nameCell.size());

        // search users by label value
        replaceInputElementByName("search", "label=label2=" + name + "8");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(9, nameCell.size());

        // search users by label value and name
        replaceInputElementByName("search", "label=label2=" + name + "8" + " name=" + name + "1");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(1, nameCell.size());

        // search users by partial name
        replaceInputElementByName("search", "name=" + name + "1");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(10, nameCell.size());

        // search users by full name
        replaceInputElementByName("search", "name=" + name + "19");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(1, nameCell.size());

        // search users by invalid name
        replaceInputElementByName("search", "name=" + name + "invalid");
        waitElement("searchButton").click();
        waitRestComplete();
        nameCell = waitTableElements("list_resource__table", "name", null, "name");
        assertEquals(0, nameCell.size());
    }
}