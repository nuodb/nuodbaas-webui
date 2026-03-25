// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/ErrorPagesTest.java
import { expect } from "@playwright/test";
import { test } from "../fixtures";

test.describe("ErrorPagesTest", () => {
  test("testNotFound – unknown UI path shows 404 page then redirects on OK", async ({
    restPage: page,
  }) => {
    await page.goto("/ui/this-page-does-not-exist");
    await page.getByTestId("not-found-header").waitFor({ state: "visible" });
    await page.getByTestId("button.ok").click();
    await page
      .getByTestId("list_resource__table")
      .waitFor({ state: "visible" });
  });

  test("testErrorPage – /ui/error?msg= shows message then redirects on OK", async ({
    restPage: page,
  }) => {
    const errorMessage = "Some Message";
    await page.goto(`/ui/error?msg=${encodeURIComponent(errorMessage)}`);
    await page.getByTestId("error-page-title").waitFor({ state: "visible" });
    await expect(page.getByTestId("error-page-message")).toHaveText(
      errorMessage,
    );
    await page.getByTestId("button.ok").click();
    await page
      .getByTestId("list_resource__table")
      .waitFor({ state: "visible" });
  });

  test("crashTest – /ui/error?crashme=true shows crash error then redirects on OK", async ({
    restPage: page,
  }) => {
    await page.goto("/ui/error?crashme=true");
    await expect(page.getByTestId("error-message")).toHaveText(
      "Error: Simulate crash",
    );
    await page.getByTestId("button.ok").click();
    await page
      .getByTestId("list_resource__table")
      .waitFor({ state: "visible" });
  });

  test("testRedirectAnonymous – unauthenticated redirect preserves original path", async ({
    page,
  }) => {
    const url = "/webui/error";
    await page.goto(url);
    await page.getByTestId("show_login_button").waitFor({ state: "visible" });
    const expectedUrl = new URL(
      `/ui/login?redirect=${encodeURIComponent(url)}`,
      page.url(),
    );
    expect(page.url()).toBe(expectedUrl.toString());
  });

  test("testRedirectAuthenticated – authenticated user landing on /webui/error shown the error page", async ({
    restPage: page,
  }) => {
    await page.goto("/webui/error");
    await page.getByTestId("error-page-title").waitFor({ state: "visible" });
    // URL should be normalized to /ui/error
    expect(page.url()).toMatch(/\/ui\/error/);
  });
});
