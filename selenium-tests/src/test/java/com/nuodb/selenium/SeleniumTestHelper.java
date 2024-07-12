package com.nuodb.selenium;

import java.io.IOException;
import java.net.URL;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SeleniumTestHelper {
    private static WebDriver driver = null;
    private static String URL_BASE = "http://selenium-tests-nginx-1";
    private static long DEFAULT_TIMEOUT_SECONDS = 10;

    @BeforeAll
    public static void beforeAll() throws IOException, InterruptedException {
        URL hubUrl = new URL("http://localhost:4444/wd/hub");
        driver = new RemoteWebDriver(hubUrl, DesiredCapabilities.chrome());
    }

    @AfterAll
    public static void afterAll() {
        driver.quit();
    }

    @BeforeEach
    public void before() {
        if(driver instanceof JavascriptExecutor) {
            get("/ui/");
            ((JavascriptExecutor)driver).executeScript("localStorage.clear();");
        }
        else {
            throw new RuntimeException("unable to clear local storage");
        }
    }

    public void get(String url) {
        if(url == null) {
            url = "/ui/";
        }
        if(url.startsWith("/")) {
            url = URL_BASE + url;
        }

        driver.get(url);
    }

    public String getTitle() {
        return driver.getTitle();
    }

    public void sendKeys(String id, String keys) {
        driver.findElement(By.id(id)).sendKeys(keys);
    }

    public void click(String id) {
        driver.findElement(By.id(id)).click();
    }

    public String getText(String id) {
        return getText(id, DEFAULT_TIMEOUT_SECONDS);
    }

    public WebElement waitElement(String id) {
        return waitElement(id, DEFAULT_TIMEOUT_SECONDS);
    }

    public WebElement waitElement(String id, long timeoutSeconds) {
        WebDriverWait wait = new WebDriverWait(driver, timeoutSeconds);
        return wait.until(ExpectedConditions.visibilityOfElementLocated(By.id(id)));
    }

    public String getText(String id, long timeoutSeconds) {
        return waitElement(id, timeoutSeconds).getText();
    }
}
