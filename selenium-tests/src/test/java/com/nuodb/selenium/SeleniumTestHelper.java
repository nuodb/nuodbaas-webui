package com.nuodb.selenium;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Method;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

@ExtendWith(TestResultLogger.class)
public class SeleniumTestHelper {
    private static WebDriver driver = null;
    private static String URL_BASE = "http://selenium-tests-nginx-1";
    private static Duration waitTimeout = Duration.ofSeconds(10);
    private TestInfo testInfo;

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
    public void before(TestInfo testInfo) {
        this.testInfo = testInfo;
        if(driver instanceof JavascriptExecutor jsDriver) {
            get("/ui/");
            jsDriver.executeScript("localStorage.clear();");
            driver.manage().window().maximize();
        }
        else {
            throw new RuntimeException("unable to clear local storage");
        }
    }

    public static void setWaitTimeout(Duration duration) {
        waitTimeout = duration;
    }

    public void setWindowSize(int width, int height) {
        driver.manage().window().setSize(new Dimension(width, height));
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

    public WebElement getElement(String id) {
        try {
            By testId = By.xpath("//*[@data-testid='" + id + "']");
            return driver.findElement(testId);
        }
        catch(NoSuchElementException e) {
            return null;
        }
    }

    public WebElement waitElement(String id) {
        By testId = By.xpath("//*[@data-testid='" + id + "']");
        WebDriverWait wait = new WebDriverWait(driver, waitTimeout);
        return wait.until(ExpectedConditions.visibilityOfElementLocated(testId));
    }

    public String waitText(String id) {
        return waitElement(id).getText();
    }

    /**
     * searches all data-testid's with the "idPrefix" followed by 0 until {number of items - 1}
     * For example if items abc0, abc1, abc2, abc4 exist, it will return the text for abc0, abc1, abc2
     * @param idPrefix
     * @param number of items requested
     * @return
     */
    public List<String> getTextList(String idPrefix, int count) {
        int index;
        WebElement element;
        List<String> items = new ArrayList<>();
        for(index=0; index<count; index++) {
            element = waitElement(idPrefix + index);
            items.add(element.getText());
        }
        while((element = getElement(idPrefix + index)) != null) {
            index++;
            items.add(element.getText());
        }
        return items;
    }

    public void login(String username, String password) {
        get("/ui/");
        sendKeys("username", username);
        sendKeys("password", password);
        click("login_button");
        assertEquals("Home", waitText("title"));
    }

    /**
     * Determines Test Class, Method and line number and returns
     * appropriate directory + filename location to store result
     * @param filename
     * @return
     */
    public Path getTestResultsPath(String filename) {
        Method method = testInfo.getTestMethod().get();
        String className = method.getDeclaringClass().getName();
        String methodName = method.getName();
        int lineNumber = -1;
        StackTraceElement[] stack = Thread.currentThread().getStackTrace();
        for(int i=1; i<stack.length; i++) {
            if(stack[i].getClassName().equals(className) && stack[i].getMethodName().equals(methodName)) {
                lineNumber = stack[i].getLineNumber();
                break;
            }
        }

        String packageName = TestResultLogger.class.getPackageName() + ".";
        if(className.startsWith(packageName)) {
            className = className.substring(packageName.length());
        }
        className = className.replace('.', File.separatorChar);
        if(lineNumber >= 0) {
            methodName += ":" + lineNumber;
        }
        if(filename != null) {
            methodName += "-" + filename;
        }
        return Path.of("target", "test-results", className, methodName);
    }

    public Path saveSnapshot(String filename) {
        Path snapshotPath = getTestResultsPath(filename);
        byte [] content = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
        try {
            Files.createDirectories(snapshotPath.getParent());
            Files.write(snapshotPath, content);
        }
        catch(IOException e) {
            throw new RuntimeException("Unable to save snapshot " + snapshotPath, e);
        }
        return snapshotPath;
    }
}
