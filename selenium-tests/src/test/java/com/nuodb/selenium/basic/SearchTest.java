// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.util.List;

public class SearchTest extends TestRoutines {
    @Test
    public void testSearch() throws IOException {
        String body = """
            {"organization":"%%%TEST_ORGANIZATION%%%",
                "name": "%%%NAME%%%",
                "password": "passw0rd",
                "accessRule": {"allow": "all:%%%TEST_ORGANIZATION%%%"},
                "labels": {
                    "label1": "value1",
                    "label2": "%%%VALUE2%%%"
                }
            }
        """;
        body = body.replaceAll("%%%TEST_ORGANIZATION%%%", TEST_ORGANIZATION);

        // Setup users
        String name = shortUnique("u");
        String labelName = "l" + name.substring(1);
        int MIN_INDEX = 10;
        int MAX_INDEX = 99;
        int PAGE_SIZE = 20;

        for(int i=MIN_INDEX; i<=MAX_INDEX; i++) {
            System.out.println("Creating user /" + TEST_ORGANIZATION + "/" + (name + i));
            createResourceRest(Resource.users, "/" + TEST_ORGANIZATION + "/" + (name + i), body.replaceAll("%%%NAME%%%", name + i).replaceAll("%%%VALUE2%%%", (labelName + (i%10))));
        }

        // verify we have full page of users
        loginRest();
        clickMenu("users");
        waitRestComplete();
        retry(()->{
            List<WebElement> nameCell = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(20, nameCell.size());
        });

        // search all created users and check that we have Math.Ceil(totalUsers/20) pages
        replaceInputElementByName("search", name + "*");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();

        WebElement pagination = waitElement("pagination");
        List<WebElement> paginationButtons = pagination.findElement(By.tagName("ul")).findElements(By.tagName("button"));
        assertEquals((int)Math.ceil(((double)MAX_INDEX - (double)MIN_INDEX + (double)1)/(double)PAGE_SIZE), paginationButtons.size() - 2); // subtract "2" for the previous/next buttons

        // search users starting with "1" index and check that 10 users are returned
        replaceInputElementByName("search", name + "1*");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()-> {
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(10, nc.size());
        });

        // search users by label existence
        replaceInputElementByName("search", "labels=label1");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()-> {
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(20, nc.size());
        });

        // search users by label value
        replaceInputElementByName("search", "labels=label2=" + labelName + "8");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(9, nc.size());
        });

        // search users by label value and name
        replaceInputElementByName("search", "labels=label2=" + labelName + "8" + " name=" + name + "1*");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()-> {
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(1, nc.size());
        });

        // search all users by name=*
        replaceInputElementByName("search", "name=" + name + "*");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(20, nc.size());
        });

        // search users by partial name
        replaceInputElementByName("search", "name=" + name + "1*");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(10, nc.size());
        });

        replaceInputElementByName("search", "name=*" + name.substring(1) + "1*");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(10, nc.size());
        });

        replaceInputElementByName("search", "name=*" + name.substring(2) + "18");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(1, nc.size());
        });

        // search users by full name
        replaceInputElementByName("search", "name=" + name + "19");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(1, nc.size());
        });

        // search users by invalid name
        replaceInputElementByName("search", "name=" + name + "invalid");
        waitInputElementByName("search").sendKeys(Keys.RETURN);
        waitRestComplete();
        retry(()->{
            var nc = waitTableElements("list_resource__table", "name", null, "name");
            assertEquals(0, nc.size());
        });
    }
}