package com.nuodb.selenium;

import java.nio.file.Path;

import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TestResultLogger implements TestWatcher {


    private SeleniumTestHelper getTestHelper(ExtensionContext context) {
        return (SeleniumTestHelper)context.getTestInstance().get();
    }

    @Override
    public void testSuccessful(ExtensionContext context) {
        Logger LOG = LoggerFactory.getLogger(context.getTestClass().get());

        Path snapshotPath = getTestHelper(context).saveSnapshot("SUCCESS.png");
        LOG.error("Test {} successful", context.getTestMethod().get().getName());
        LOG.error("  Snapshot saved in {}", snapshotPath.toAbsolutePath());
    }

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        Logger LOG = LoggerFactory.getLogger(context.getTestClass().get());

        Path snapshotPath = getTestHelper(context).saveSnapshot("FAILED.png");
        LOG.error("Test {} failed", context.getTestMethod().get().getName());
        LOG.error("  Snapshot saved in {}", snapshotPath.toAbsolutePath());
    }
}