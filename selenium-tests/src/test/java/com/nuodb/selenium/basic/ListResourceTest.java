// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import com.nuodb.selenium.Constants;
import com.nuodb.selenium.TestRoutines;


import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

public class ListResourceTest extends TestRoutines {
    @Test
    public void testDeleteMultipleUsers() {
        // Setup and list users
        login(Constants.ADMIN_ORGANIZATION, Constants.ADMIN_USER, Constants.ADMIN_PASSWORD);
        String userNames[] = { createUser(), createUser() };
        clickMenu("users");

        // check off users
        for(String userName : userNames) {
            retry(()->{
                List<WebElement> checkCell = waitTableElements("list_resource__table", "1", userName, "0");
                assertEquals(1, checkCell.size());
                checkCell.get(0).findElement(By.tagName("input")).click();
            });
        }

        // delete users ("No" button)
        WebElement deleteButton = waitElement("list_resources_multiple_delete_button");
        deleteButton.click();
        WebElement dialogNoButton = waitElement("dialog_button_no");
        dialogNoButton.click();

        // verify users are still present
        waitRestComplete();
        retry(()-> {
            for(String userName : userNames) {
                List<WebElement> buttonsCell = waitTableElements("list_resource__table", "1", userName, "0");
                assertEquals(1, buttonsCell.size());
            }
        });

        // delete users ("Yes" button)
        deleteButton = waitElement("list_resources_multiple_delete_button");
        deleteButton.click();
        WebElement dialogYesButton = waitElement("dialog_button_yes");
        dialogYesButton.click();

        // verify user is gone
        waitRestComplete();
        retry(()-> {
            for(String userName : userNames) {
                List<WebElement> buttonsCell = waitTableElements("list_resource__table", "1", userName, "0");
                assertEquals(0, buttonsCell.size());
            }
        });
    }
}