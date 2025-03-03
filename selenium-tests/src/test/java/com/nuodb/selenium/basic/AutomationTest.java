// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

package com.nuodb.selenium.basic;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nuodb.selenium.TestRoutines;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class AutomationTest extends TestRoutines {
    @Test
    public void testRecordingCreateAndDeleteUsers() throws JsonProcessingException {
        // Start Recording
        login();
        clickUserMenu("automation");
        clearSessionStorage("nuodbaas-webui-recorded");
        clearSessionStorage("nuodbaas-webui-isRecording");
        click("btnStartRecording");

        // Setup and list users
        String userName = createUser();
        clickMenu("users");

        // find user and delete
        deleteUser(userName);
        waitRestComplete();

        // Stop Recording
        retry(()->{
            clickUserMenu("automation");
            click("btnStopRecording");
        });

        // Validate recording
        String strRecording = getSessionStorage("nuodbaas-webui-recorded");
        ObjectMapper mapper = new ObjectMapper();
        JsonNode items = mapper.readTree(strRecording);
        int [] putDelete = { 0, 0};
        items.forEach(item -> {
            String method = item.get("method").asText();
            if(method.equalsIgnoreCase("put")) {
                putDelete[0]++;
            }
            else if(method.equalsIgnoreCase("delete")) {
                putDelete[1]++;
            }
        });
        assertEquals(1, putDelete[0]);
        assertEquals(1, putDelete[1]);
    }
}