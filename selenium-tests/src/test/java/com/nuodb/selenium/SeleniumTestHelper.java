package com.nuodb.selenium;

import java.io.IOException;
import java.net.URL;
import java.time.Duration;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SeleniumTestHelper {
    private static WebDriver driver = null;
    private static String URL_BASE = "http://selenium-tests-nginx-1";
    private static Duration waitTimeout = Duration.ofSeconds(10);

    @BeforeAll
    public static void beforeAll() throws IOException, InterruptedException {
        URL hubUrl = new URL("http://localhost:4444/wd/hub");
        driver = new RemoteWebDriver(hubUrl, new ChromeOptions());
    }

    @AfterAll
    public static void afterAll() {
        driver.quit();
    }

    @BeforeEach
    public void before() {
        if(driver instanceof JavascriptExecutor jsDriver) {
            get("/ui/");
            jsDriver.executeScript("localStorage.clear();");
        }
        else {
            throw new RuntimeException("unable to clear local storage");
        }
    }

    public static void setWaitTimeout(Duration duration) {
        waitTimeout = duration;
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
        waitInputElement(id).sendKeys(keys);
    }

    private WebElement waitInputElement(String id) {
        WebElement element = waitElement(id);
        if(element.getTagName().equals("input")) {
            return element;
        }
        return element.findElement(By.tagName("input"));
    }

    public void click(String id) {
        waitElement(id).click();
    }

    public WebElement waitElement(String id) {
        By testId = By.xpath("//*[@data-testid='" + id + "']");
        WebDriverWait wait = new WebDriverWait(driver, waitTimeout);
        return wait.until(ExpectedConditions.visibilityOfElementLocated(testId));
    }

    public String getText(String id) {
        return waitElement(id).getText();
    }
}
