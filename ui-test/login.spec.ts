// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/LoginTest.java
import { test, expect, Page } from "@playwright/test";
import { loginViaUI, TEST_ADMIN_PASSWORD, TEST_ADMIN_USER, TEST_ORGANIZATION, waitRestComplete } from "./helpers/ui";

/** Reveals the login form whether or not an SSO provider list is shown. */
async function revealLoginForm(page: Page) {
  await waitRestComplete(page);
  const showBtn = page.getByTestId("show_login_button");
  await showBtn.waitFor({ state: "visible" });
  await showBtn.click();
  await page.getByTestId("organization").locator("input").waitFor();
}

test.describe("LoginTest", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ui/");
  });

  test("testTitle – page title is NuoDB", async ({ page }) => {
    await expect(page).toHaveTitle("NuoDB");
  });

  test("testInvalidLogin – bad credentials show error", async ({ page }) => {
    await revealLoginForm(page);
    await page.getByTestId("organization").locator("input").fill("invalid_org");
    await page.getByTestId("username").locator("input").fill("invalid_user");
    await page
      .getByTestId("password")
      .locator("input")
      .fill("invalid_password");
    await page.getByTestId("login_button").click();
    const error = page.getByTestId("error_message");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/Bad credentials/i);
  });

  test("testLogin – successful login redirects away from /ui/login", async ({
    page,
  }) => {
    await loginViaUI(
      page,
      TEST_ORGANIZATION,
      TEST_ADMIN_USER,
      TEST_ADMIN_PASSWORD,
    );
    await expect(page).not.toHaveURL(/\/ui\/login/);
  });

  test("testIdp – CAS IdP button label", async ({ page }) => {
    await page.goto("/ui/login");
    const btnKeycloak = page.getByTestId("login_cas-keycloak");
    const btnSimple = page.getByTestId("login_cas-simple");
    await expect(btnKeycloak).toBeVisible();
    await expect(btnSimple).toBeVisible();
    await expect(btnKeycloak).toHaveText("Login With CAS Keycloak");
    await expect(btnSimple).toHaveText("Login With CAS Simple");
  });

  test("testNonExistentIdp – unknown provider shows error", async ({
    page,
  }) => {
    await page.goto("/ui/login?provider=bogus");
    await expect(page.getByTestId("progress_message")).toHaveText(
      "Logging in with bogus...",
    );
    await expect(page.getByTestId("error_message")).toHaveText(
      "Login failed: No provider named bogus",
    );
  });

  test("testInvalidIdpLoginRequest – missing ticket param", async ({
    page,
  }) => {
    await page.goto("/ui/login?provider=cas-simple");
    await expect(page.getByTestId("progress_message")).toHaveText(
      "Logging in with cas-simple...",
    );
    await expect(page.getByTestId("error_message")).toHaveText(
      "Login failed: Query parameter 'ticket' not supplied",
    );
  });

  test("testUnsuccessfulIdpLogin – invalid ticket causes 500 error", async ({
    page,
  }) => {
    await page.goto("/ui/login?provider=cas-simple&ticket=ST-123");
    await expect(page.getByTestId("progress_message")).toHaveText(
      "Logging in with cas-simple...",
    );
    await expect(page.getByTestId("error_message")).toHaveText(
      "Login failed: Unable to authenticate user with CAS provider cas-simple",
    );
  });
});
