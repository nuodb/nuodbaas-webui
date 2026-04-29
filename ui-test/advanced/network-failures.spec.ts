// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
// Converted from: selenium-tests/…/basic/UserTest.java
/// <reference types="node" />
import { test } from "../fixtures";
import {
  clickMenu,
  retry,
  sleep,
  waitRestComplete,
  waitTableElements,
} from "../helpers/ui";
import {
  createUserRest,
  deleteResourceRest,
  TEST_ADMIN_PASSWORD,
  TEST_ADMIN_USER,
  TEST_ORGANIZATION,
} from "../helpers/api";
import { expect, Locator } from "@playwright/test";
import net from "net";

const tcpConnections = new Set<net.Socket>();

/**
 * Starts a TCP forwarder that listens on `sourcePort` and forwards all traffic
 * to `targetPort`.
 * This is used to simulate a temporary disconnect to the control plane
 *
 * @param sourcePort - Port on which the forwarder will listen.
 * @param targetPort - Destination port to which traffic will be piped.
 * @returns A promise that resolves with the `net.Server` instance once it is listening.
 */
export async function startTcpForwarder(
  sourceHost: string,
  sourcePort: number,
  targetHost: string,
  targetPort: number,
): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((clientSocket) => {
      // When a client connects, open a connection to the target.
      const targetSocket = net.connect(targetPort, targetHost);
      tcpConnections.add(clientSocket);

      // Pipe data both ways.
      clientSocket.pipe(targetSocket);
      targetSocket.pipe(clientSocket);

      // If either side ends, close the other side.
      clientSocket.on("close", () => targetSocket.end());
      targetSocket.on("close", () => clientSocket.end());

      // Propagate errors (they will also cause the server to close the socket).
      clientSocket.on("error", (err) =>
        console.error("Client socket error:", err),
      );
      targetSocket.on("error", (err) =>
        console.error("Target socket error:", err),
      );
    });

    server.on("error", (err) => reject(err));

    // Start listening.
    server.listen(sourcePort, sourceHost, () => {
      console.info(`TCP forwarder listening on ${sourcePort} → ${targetPort}`);
      resolve(server);
    });
  });
}

/**
 * Stops a TCP forwarder created by `startTcpForwarder`.
 *
 * @param server - The `net.Server` instance returned from `startTcpForwarder`.
 * @returns A promise that resolves when the server has fully closed.
 */
export async function stopTcpForwarder(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    for (const socket of tcpConnections) {
      socket.destroy(); // Hard reset the connection
    }
    tcpConnections.clear();
    server.close((err) => {
      if (err) {
        console.error("Error while stopping TCP forwarder:", err);
        reject(err);
      } else {
        console.info("TCP forwarder stopped");
        resolve();
      }
    });
  });
}

test.describe("UserTest", () => {
  test("SSE network outage", async ({ restPage: page }) => {
    let server = await startTcpForwarder("localhost", 8089, "localhost", 80);

    // create user
    let userName = await createUserRest();

    // Login (using the TCP forwarder port)
    await page.goto("http://localhost:8089/ui/login");
    const showLoginBtn = page.getByTestId("show_login_button");
    await showLoginBtn.waitFor({ state: "visible" });
    await showLoginBtn.click();
    await page
      .getByTestId("organization")
      .locator("input")
      .fill(TEST_ORGANIZATION);
    await page.getByTestId("username").locator("input").fill(TEST_ADMIN_USER);
    await page
      .getByTestId("password")
      .locator("input")
      .fill(TEST_ADMIN_PASSWORD);
    await page.getByTestId("login_button").click();
    await page.waitForURL(/\/ui(?!\/login)/);

    // verify user exists
    await clickMenu(page, "users");
    let cells: Locator[];
    await retry(async () => {
      cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(cells.length).toBe(1);
    });

    // delete the user
    deleteResourceRest("users", "integrationtest/" + userName);

    // verify user no longer shows in UI (due to SSE update)
    await retry(async () => {
      cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(cells.length).toBe(0);
    });

    // create another user and verify user shows up in the UI
    userName = await createUserRest();

    // reload user view until new user appears
    await retry(async () => {
      await clickMenu(page, "projects");
      await waitRestComplete(page);
      await clickMenu(page, "users");
      await waitRestComplete(page);
      cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(cells.length).toBe(1);
    });

    // simulate temporary network outage (will disconnect the existing SSE connection)
    await stopTcpForwarder(server);

    // delete USER (using REST service)
    deleteResourceRest("users", TEST_ORGANIZATION + "/" + userName);

    // restart TCP tunnel
    server = await startTcpForwarder("localhost", 8089, "localhost", 80);

    // wait until the user shows as deleted in the UI (SSE should reconnect)
    await retry(async () => {
      cells = await waitTableElements(
        page,
        "list_resource__table",
        "name",
        userName,
        "$ref",
      );
      expect(cells.length).toBe(0);
    }, 3);

    // shut down TCP server and set UI back to default host
    await page.goto("http://localhost/ui/");
    await stopTcpForwarder(server);
  });
});
