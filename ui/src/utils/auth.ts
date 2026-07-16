// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.
import axios from "axios";
import { RegionSetting, RegionSettings, TempAny } from "./types";

/**
 * Authenticates users and stores info in localStorage "credentials".
 */

interface Credentials {
  token: string;
  expiresAtTime: string;
  username: string;
  accessRule?: any;
}

export function isBrowser() {
  return typeof window !== "undefined";
}

function getCookieValue(cookieName: string) {
  const cookies = document.cookie.split(";");
  const match = cookies
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function setCookieValue(cookieName: string, cookieValue: string | null) {
  const maxAge = cookieValue === null ? 0 : 400 * 24 * 3600; //browsers cap cookie lifespan to 400 days. Note: Apple Safari's Intelligent Tracking Prevention can restrict certain client-side cookies to just 7 days or even 24 hours to protect user privacy.
  const domainLastTwoParts = window.location.hostname
    .split(".")
    .slice(-2)
    .join(".");
  document.cookie =
    cookieName +
    "=" +
    encodeURIComponent(cookieValue || "") +
    "; max-age=" +
    String(maxAge) +
    "; path=/" +
    "; domain=." +
    domainLastTwoParts +
    "; Secure" +
    "; SameSite=Lax";
}

export default class Auth {
  static isLoggedIn(): boolean {
    return this.getCredentials() ? true : false;
  }

  static getRegions(): RegionSettings {
    try {
      return JSON.parse(getCookieValue("nuodbaasRegions") || "[]");
    } catch {
      return [];
    }
  }

  static setRegions(regions: RegionSettings) {
    setCookieValue("nuodbaasRegions", JSON.stringify(regions));
  }

  static regionEquals(
    region1: RegionSetting | null,
    region2: RegionSetting | null,
  ) {
    if (region1 === null && region2 === null) {
      return true;
    }
    if (region1 === null || region2 === null) {
      return false;
    }
    return (
      region1.ui === region2.ui &&
      region1.cp === region2.cp &&
      region1.sql == region2.sql &&
      region1.name === region2.name
    );
  }

  static getCurrentRegion(): RegionSetting | null {
    try {
      const strCurrentRegion = getCookieValue("nuodbaasCurrentRegion");
      if (strCurrentRegion) {
        const currentRegion: RegionSetting = JSON.parse(strCurrentRegion);
        if (
          currentRegion.name &&
          (currentRegion.ui || currentRegion.cp || currentRegion.sql)
        ) {
          return currentRegion;
        }
      }
    } catch {
      // we run into this if
      // - JSON format is invalid
      // - localStorage is not be available (i.e. if Playwright test calls it before a page.goto())
      return null;
    }

    return null;
  }

  static findRegionFromCurrentUrl(
    regions: RegionSettings,
  ): RegionSetting | undefined {
    const hrefLower = window.location.href.toLowerCase();
    const pathLower = window.location.pathname.toLowerCase();

    return regions.find((region) => {
      const uiLower = region.ui?.toLowerCase();
      if (hrefLower === uiLower || hrefLower.startsWith(uiLower + "/")) {
        return true;
      }
      if (pathLower === uiLower || pathLower.startsWith(uiLower + "/")) {
        return true;
      }
      return false;
    });
  }

  static setCurrentRegion(region: RegionSetting | null) {
    if (region === null) {
      setCookieValue("nuodbaasCurrentRegion", null);
    } else {
      setCookieValue("nuodbaasCurrentRegion", JSON.stringify(region));
    }
  }

  static isCurrentRegion(region: RegionSetting | null) {
    const currentRegion = Auth.getCurrentRegion();
    console.log("currentRegion", currentRegion);
    if (currentRegion === null && region === null) {
      return true;
    } else if (currentRegion === null || region === null) {
      return false;
    }

    if (
      currentRegion.name === region.name &&
      currentRegion.cp === region.cp &&
      currentRegion.sql === region.sql
    ) {
      return true;
    } else {
      return false;
    }
  }

  static getDefaultUiPrefixPath(): string {
    return "/ui";
  }

  static getDefaultCpPrefixPath(): string {
    // The default for the NuoDB REST Control Plane prefix is "/nuodb-cp", which can be overwritten by the
    // environment variable NUODB_CP_REST_URL in the Docker container or Helm Chart config.
    //
    // When the Docker container starts up, it will replace "___NUODB_CP_REST_URL___" in the
    // built client with the custom URL using string replacement. I had to prevent the JavaScript
    // optimizer / webpack to optimize the next line, that's why I split the constant and made it
    // dependent on the current time (it will always be after January 1, 1970)
    let prefixPath = "/nuodb-cp";
    if (
      "___NUODB_CP_REST_URL___" !==
      "___NUODB_CP" + (Date.now() > 0 ? "_REST_URL___" : "")
    ) {
      prefixPath = "___NUODB_CP_REST_URL___";
    }
    return prefixPath;
  }

  static getDefaultSqlPrefixPath(): string {
    // The default for the NuoDB SQL prefix is "/api/sql", which can be overwritten by the
    // environment variable NUODB_SQL_REST_URL in the Docker container or Helm Chart config.
    //
    // When the Docker container starts up, it will replace "___NUODB_SQL_REST_URL___" in the
    // built client with the custom URL using string replacement. I had to prevent the JavaScript
    // optimizer / webpack to optimize the next line, that's why I split the constant and made it
    // dependent on the current time (it will always be after January 1, 1970)
    let prefixPath = "/api/sql";
    if (
      "___NUODB_SQL_REST_URL___" !==
      "___NUODB_SQL" + (Date.now() > 0 ? "_REST_URL___" : "")
    ) {
      prefixPath = "___NUODB_SQL_REST_URL___";
    }
    return prefixPath;
  }

  static getNuodbCpRestUrl(path: string) {
    let prefixPath = Auth.getDefaultCpPrefixPath();

    const currentRegion = Auth.getCurrentRegion();
    if (currentRegion && currentRegion.cp) {
      prefixPath = currentRegion.cp;
    }

    while (prefixPath.endsWith("/")) {
      prefixPath.substring(0, prefixPath.length - 1);
    }

    while (path.startsWith("/")) {
      path = path.substring(1);
    }

    return prefixPath + "/" + path;
  }

  static getNuodbSqlRestUrl(path: string) {
    let prefixPath = Auth.getDefaultSqlPrefixPath();

    const currentRegion = Auth.getCurrentRegion();
    if (currentRegion && currentRegion.sql) {
      prefixPath = currentRegion.sql;
    }

    while (prefixPath.endsWith("/")) {
      prefixPath.substring(0, prefixPath.length - 1);
    }

    while (path.startsWith("/")) {
      path = path.substring(1);
    }

    if (isBrowser()) {
      return prefixPath + "/" + path;
    } else {
      return "http://localhost/api/" + path;
    }
  }

  static async login(username: string, password: string) {
    return new Promise((resolve) => {
      axios
        .post(
          Auth.getNuodbCpRestUrl("login"),
          { expiresIn: "24h" },
          {
            auth: { username, password },
            headers: { "Content-Type": "application/json" },
          },
        )
        .then((response) => {
          if (
            response.data &&
            response.data.token &&
            response.data.expiresAtTime
          ) {
            this.setCredentials({
              token: response.data.token,
              expiresAtTime: response.data.expiresAtTime,
              accessRule: response.data.accessRule,
              username,
            });
            resolve(null);
          }
        })
        .catch(resolve);
    });
  }

  static hasAccess(
    method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE",
    path: string,
    sla?: string,
  ): boolean {
    function isMatch(rule: string) {
      const ruleParts = rule.split(":");
      if (ruleParts.length < 2) {
        return false;
      }
      const verb = ruleParts[0];
      const resourceSpecifier = ruleParts[1];
      const slaMatch = !sla || ruleParts.length < 3 || ruleParts[2] === sla;

      if (!resourceSpecifier || !slaMatch || !path || !path.startsWith("/")) {
        return false;
      }

      if (verb === "all") {
        // all HTML methods are allowed
      } else if (verb === "read" && method !== "GET") {
        return false;
      } else if (
        verb === "write" &&
        method !== "PUT" &&
        method !== "PATCH" &&
        method !== "POST"
      ) {
        return false;
      } else if (verb === "delete" && method !== "DELETE") {
        return false;
      }

      // There are two types of resource specifiers - see:
      // https://nuodb.github.io/nuodb-cp-docs/docs/administration/authentication/user-management/#resource-specifier
      // If a resource specifier starts with /, then it is interpreted as an absolute resource path (i.e. /databases/org1/project1/databaseq)
      // Otherwise it is interpreted as a scope, which has the format <organization>/<project>/<database>, <organization>/<project>, or <organization>.
      const specifierParts = resourceSpecifier.split("/");
      if (resourceSpecifier.startsWith("/")) {
        const pathParts = path.split("/");
        if (specifierParts.length > pathParts.length) {
          return false;
        }
        for (let i = 0; i < specifierParts.length; i++) {
          if (specifierParts[i] === "*") {
            return true;
          } else if (
            specifierParts[i] !== pathParts[i] &&
            !pathParts[i].startsWith("{")
          ) {
            return false;
          }
        }
        return true;
      } else {
        const pathParts = path.startsWith("/events/")
          ? path.substring("/events".length).split("/")
          : path.split("/");
        if (
          specifierParts.length > pathParts.length - 2 &&
          specifierParts[pathParts.length - 2] !== "*"
        ) {
          return false;
        }
        for (let i = 0; i < specifierParts.length; i++) {
          if (specifierParts[i] === "*") {
            return true;
          }
          // Example values (to explain "+2" logic below):
          // resourceSpecifier: "project1/db1" -> specifierParts: ["project1", "db1"]
          // path: "/databases/project1/db1" -> pathParts: ["", "databases", "project1", "db1"]
          else if (
            specifierParts[i] !== pathParts[i + 2] &&
            !pathParts[i + 2].startsWith("{")
          ) {
            return false;
          }
        }
        return true;
      }
    }

    const accessRule = Auth.getAccessRule();
    for (let i = 0; i < accessRule.deny.length; i++) {
      if (isMatch(accessRule.deny[i])) {
        return false;
      }
    }
    for (let i = 0; i < accessRule.allow.length; i++) {
      if (isMatch(accessRule.allow[i])) {
        return true;
      }
    }
    return false;
  }

  static hasSlaRules(): boolean {
    const accessRule = Auth.getAccessRule();
    const allAccessRules = [
      ...(accessRule.deny || []),
      ...(accessRule.allow || []),
    ];
    for (let i = 0; i < allAccessRules.length; i++) {
      if (allAccessRules[i].split(":").length >= 3) {
        return true;
      }
    }
    return false;
  }

  static logout() {
    this.setCredentials(null);
  }

  static getAvatarText() {
    const credentials = this.getCredentials();
    if (credentials) {
      const parts = credentials.username.split("/");
      if (parts.length > 0) {
        const name = parts[parts.length - 1];
        if (name.length > 0) {
          return name[0].toUpperCase();
        }
      }
    }
    return null;
  }

  static inMemoryCredentials: Credentials | null = null;

  static getCredentials(): Credentials | null {
    if (isBrowser()) {
      const lcCredentials = localStorage.getItem("credentials");
      if (!lcCredentials) {
        return null;
      }
      return JSON.parse(lcCredentials);
    } else {
      // fallback for non-browser environments (i.e. Playwright tests)
      return this.inMemoryCredentials;
    }
  }

  static setCredentials(credentials: Credentials | null) {
    if (isBrowser()) {
      if (credentials) {
        localStorage.setItem("credentials", JSON.stringify(credentials));
      } else {
        localStorage.removeItem("credentials");
      }
    } else {
      // fallback for non-browser environments (i.e. Playwright tests)
      this.inMemoryCredentials = credentials;
    }
  }

  static getHeaders(): TempAny {
    const credentials = this.getCredentials();
    if (!credentials) {
      return {};
    } else {
      return { Authorization: "Bearer " + credentials.token };
    }
  }

  static handle401Error(error: TempAny) {
    if (error.response && error.response.status === 401) {
      Auth.logout();
      if (isBrowser()) {
        window.location.href =
          "/ui/login?redirect=" + encodeURIComponent(window.location.pathname);
      }
    }
  }

  static getAccessRule(): { allow: string[]; deny: string[] } {
    const credentials = this.getCredentials();
    const accessRule = credentials?.accessRule || {};
    let allow = accessRule.allow || ["all:*"];
    if (allow.length === 0) {
      // There should be at least one allow rule but there is none provided.
      // As a fallback, enable the UI to show all resources, so the UI is at least functional.
      // It may show additional buttons in the UI, but the Control Plane REST service will prevent
      // operations if the user doesn't have access.
      allow = ["all:*"];
    }
    return { allow, deny: accessRule.deny || [] };
  }
}
