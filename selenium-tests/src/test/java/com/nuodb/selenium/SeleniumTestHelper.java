// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

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
import org.openqa.selenium.Keys;
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
    private static final String SHOW_CHROME_DEVTOOLS = "SHOW_CHROME_DEVTOOLS";
    private static final String URL_BASE = "http://selenium-tests-nginx-1";
    private static final Duration waitTimeout = Duration.ofSeconds(15);
    private static WebDriver driver = null;
    private TestInfo testInfo;

    @BeforeAll
    public static void beforeAll() throws IOException, InterruptedException {
        URL hubUrl = new URL("http://localhost:4444/wd/hub");
        ChromeOptions options = new ChromeOptions();
        if("true".equals(System.getProperty(SHOW_CHROME_DEVTOOLS)) || "true".equals(System.getenv(SHOW_CHROME_DEVTOOLS))) {
            options.addArguments("--auto-open-devtools-for-tabs");
        }
        driver = new RemoteWebDriver(hubUrl, options);
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

    public WebElement waitElementPresent(String id) {
        By testId = By.xpath("//*[@data-testid='" + id + "']");
        WebDriverWait wait = new WebDriverWait(driver, waitTimeout);
        return wait.until(ExpectedConditions.presenceOfElementLocated(testId));
    }

    public WebElement waitInputElementByName(String name) {
        By testId = By.xpath("//input[@name='" + name + "']");
        WebDriverWait wait = new WebDriverWait(driver, waitTimeout);
        return wait.until(ExpectedConditions.visibilityOfElementLocated(testId));
    }

    public WebElement waitPresentInputElementByName(String name) {
        By testId = By.xpath("//input[@name='" + name + "']");
        WebDriverWait wait = new WebDriverWait(driver, waitTimeout);
        return wait.until(ExpectedConditions.presenceOfElementLocated(testId));
    }

    public void replaceInputElementByName(String name, String value) {
        WebElement element = waitInputElementByName(name);
        element.click();
        element.sendKeys(Keys.chord(Keys.CONTROL, "A"));
        element.sendKeys(value);
    }

    public String waitText(String id) {
        return waitElement(id).getText();
    }

    /**
     * returns column number
     * @param searchValues values to search
     * @param searchColumn numberic(index) or value to find index
     * @return -1 if not found or out of range
     */
    private int getColumn(List<String> searchValues, String searchColumn) {
        int column = searchValues.indexOf(searchColumn);
        if(column >= 0) {
            return column;
        }

        try {
            column = Integer.parseInt(searchColumn);
            if(column < 0 || column >= searchValues.size()) {
                return -1;
            }
            return column;
        }
        catch(NumberFormatException e) {
            return -1;
        }
    }

    /**
     * Returns matching elements of a table search
     * @param tableId data-testid of table element
     * @param searchColumn numeric (index) or column name to search
     * @param searchValue find all rows with this value at the specified searchColumn
     * @param resultColumn numeric (index) or column name to return element cell
     * @return element of matching cells (resultColumn specified) or entire row element (resultColumn = null)
     */
    public List<WebElement> waitTableElements(String tableId, String searchColumn, String searchValue, String resultColumn) {
        WebElement table = waitElementPresent(tableId);
        WebElement thead = table.findElement(By.tagName("thead"));
        List<String> headers = thead.findElements(By.tagName("th")).stream().map(head -> head.getAttribute("data-testid")).toList();
        int sColumn = getColumn(headers, searchColumn);
        int rColumn = Integer.MAX_VALUE;
        rColumn = getColumn(headers, resultColumn);

        List<WebElement> ret = new ArrayList<>();
        if(sColumn < 0 || rColumn < 0) {
            return ret;
        }

        WebElement body = table.findElement(By.tagName("tbody"));
        for(WebElement row : body.findElements(By.tagName("tr"))) {
            List<WebElement> cells = row.findElements(By.tagName("td"));
            if(sColumn < cells.size() && (resultColumn == null || rColumn < cells.size())) {
                if(searchValue == null || searchValue.equals(cells.get(sColumn).getText())) {
                    ret.add(cells.get(rColumn));
                }
            }
        }

        return ret;
    }

    /**
     * searches all data-testid's with the "idPrefix" followed by sequential numbers starting from 0.
     * For example if items abc0, abc1, abc2, abc4 exist, it will return the text for abc0, abc1, abc2
     * It ignores all empty values.
     *
     * Specify in "minimumItems" the number you are expecting. If the UI changes a control (i.e. creating
     * a list of 100 items), the items are not created at once, but rather each item is added individually.
     * If Selenium retrieves the item list while it's being created half way, it might only get the first 50
     * items. For this reason, this methods waits for the first "minimumItems" to appear. If more exist,
     * they will be returned as well, but it will not wait for the UI update to complete.
     * @param idPrefix
     * @param minimumItems minimum number of items requested
     * @return
     */
    public List<String> getTextList(String idPrefix, int minimumItems) {
        int index;
        WebElement element = null;
        List<String> items = new ArrayList<>();
        for(index=0; index<minimumItems; index++) {
            for(int retry=0; retry < 10; retry++) {
                element = waitElement(idPrefix + index);
                if(element.getText().length() > 0) {
                    break;
                }
                sleep(50);
            }
            items.add(element.getText());
        }
        while((element = getElement(idPrefix + index)) != null) {
            index++;
            String text = element.getText();
            if(text.length() > 0) {
                items.add(element.getText());
            }
        }
        return items;
    }

    /**
     * searches all elements with "idPrefix + index" (starting from 0 until found) having specified text value
     * @param idPrefix data-testid to search for (with index appended to it)
     * @param textValue text to search for (case insensitive)
     * @return found element. If not found, method times out.
     */
    public WebElement findElementFromList(String idPrefix, String textValue) {
        int index = 0;
        while(true) {
            WebElement element = waitElement(idPrefix + index);
            if(element.getText().equalsIgnoreCase(textValue)) {
                return element;
            }
            index++;
        }
    }

    public void login(String organization, String username, String password) {
        get("/ui/");
        sendKeys("organization", organization);
        sendKeys("username", username);
        sendKeys("password", password);
        click("login_button");
        assertEquals("Home", waitText("path_component"));
        waitElement("banner-done");
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

    public void sleep(int ms) {
        try {
            Thread.sleep(ms);
        }
        catch(InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
