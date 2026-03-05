// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.
/**
 * REST API helper utilities – mirrors the Java TestRoutines REST methods.
 *
 * Credentials / endpoints are configured via environment variables:
 *   TEST_ORGANIZATION    (default: integrationtest)
 *   TEST_ADMIN_USER      (default: admin)
 *   TEST_ADMIN_PASSWORD  (default: passw0rd)
 *   CP_URL               (default: http://localhost/api)
 */

export const TEST_ORGANIZATION =
  process.env.TEST_ORGANIZATION ?? "integrationtest";
export const TEST_ADMIN_USER = process.env.TEST_ADMIN_USER ?? "admin";
export const TEST_ADMIN_PASSWORD =
  process.env.TEST_ADMIN_PASSWORD ?? "passw0rd";
export const CP_URL = process.env.CP_URL ?? "http://localhost/api";

export type Resource = "users" | "projects" | "databases" | "backups";

/** Resources in creation order; clean-up iterates in reverse. */
export const RESOURCE_ORDER: Resource[] = [
  "users",
  "projects",
  "databases",
  "backups",
];

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

/**
 * Returns a short, unique name using base-36 encoding of current time modulo
 * 30 days (10 ms granularity) – mirrors TestRoutines.shortUnique().
 */
export function shortUnique(prefix = "s"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let sb = prefix;
  let value = Math.floor((Date.now() % (30 * 24 * 3600 * 1000)) / 10);
  while (value > 0) {
    sb += chars[value % 36];
    value = Math.floor(value / 36);
  }
  return sb;
}

// ---------------------------------------------------------------------------
// Low-level REST helpers
// ---------------------------------------------------------------------------

function adminAuthHeader(
  org = TEST_ORGANIZATION,
  user = TEST_ADMIN_USER,
  password = TEST_ADMIN_PASSWORD,
): string {
  return (
    "Basic " + Buffer.from(`${org}/${user}:${password}`).toString("base64")
  );
}

/**
 * Makes an authenticated REST API call against CP_URL.
 * Throws on non-2xx responses.
 */
export async function restApi(
  method: string,
  path: string,
  body?: unknown,
  authHeader = adminAuthHeader(),
): Promise<any> {
  const url = CP_URL + (path.startsWith("/") ? path : `/${path}`);
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${method} ${url} → ${res.status} ${res.statusText}: ${text}`,
    );
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export interface Credentials {
  token: string;
  expiresAtTime: string;
  username: string;
}

/**
 * Obtains a JWT from POST /login and returns credentials suitable for
 * writing to localStorage["credentials"].
 */
export async function getCredentials(
  org = TEST_ORGANIZATION,
  user = TEST_ADMIN_USER,
  password = TEST_ADMIN_PASSWORD,
): Promise<Credentials> {
  const auth = adminAuthHeader(org, user, password);
  const data = await restApi("POST", "/login", { expiresIn: "24h" }, auth);
  return { ...data, username: `${org}/${user}` };
}

// ---------------------------------------------------------------------------
// Resource CRUD helpers
// ---------------------------------------------------------------------------

/** Lists all items of a resource (as "$ref" path strings). */
export async function getResourcesRest(resource: Resource): Promise<string[]> {
  const data = await restApi("GET", `/${resource}?listAccessible=true`);
  return data?.items ?? [];
}

/** Deletes a single resource by its "$ref" path. */
export async function deleteResourceRest(
  resource: Resource,
  refPath: string,
): Promise<void> {
  await restApi("DELETE", `/${resource}/${refPath}`);
}

/**
 * Creates a resource via REST PUT.
 * `namePath` is the path suffix appended to `/<resource>/` (may start with "/").
 */
export async function createResourceRest(
  resource: Resource,
  namePath: string,
  body: Record<string, unknown>,
): Promise<void> {
  const path = namePath.startsWith("/") ? namePath : `/${namePath}`;
  await restApi("PUT", `/${resource}${path}`, body);
}

/**
 * Deletes all non-"keep", non-admin resources after each test –
 * mirrors TestRoutines.after().
 */
export async function cleanupResources(): Promise<void> {
  const order = [...RESOURCE_ORDER].reverse() as Resource[];
  for (const resource of order) {
    try {
      const items = await getResourcesRest(resource);
      await Promise.allSettled(
        items
          .filter(
            (item) =>
              !item.startsWith(`${TEST_ORGANIZATION}/keep`) &&
              !(
                resource === "users" &&
                item === `${TEST_ORGANIZATION}/${TEST_ADMIN_USER}`
              ),
          )
          .map((item) => deleteResourceRest(resource, item)),
      );
    } catch {
      // swallow cleanup errors so one failure doesn't prevent the rest
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience factory helpers (mirror TestRoutines create* methods)
// ---------------------------------------------------------------------------

export async function createUserRest(opts?: {
  name?: string;
  allow0?: string;
  allow1?: string;
  deny0?: string;
  deny1?: string;
}): Promise<string> {
  const name = opts?.name ?? shortUnique("u");
  const allow: string[] = [];
  const deny: string[] = [];

  if (opts?.allow0) allow.push(opts.allow0);
  else allow.push(`all:${TEST_ORGANIZATION}`);
  if (opts?.allow1) allow.push(opts.allow1);
  if (opts?.deny0) deny.push(opts.deny0);
  if (opts?.deny1) deny.push(opts.deny1);

  const body: Record<string, unknown> = {
    organization: TEST_ORGANIZATION,
    name,
    password: TEST_ADMIN_PASSWORD,
    accessRule: { allow, deny },
  };
  await createResourceRest("users", `/${TEST_ORGANIZATION}/${name}`, body);
  return name;
}

export async function createProjectRest(name?: string): Promise<string> {
  const n = name ?? shortUnique("p");
  await createResourceRest("projects", `/${TEST_ORGANIZATION}/${n}`, {
    organization: TEST_ORGANIZATION,
    name: n,
    sla: "dev",
    tier: "n0.nano",
  });
  return n;
}

export async function createDatabaseRest(
  projectName: string,
  name?: string,
): Promise<string> {
  const n = name ?? shortUnique("d");
  await createResourceRest(
    "databases",
    `/${TEST_ORGANIZATION}/${projectName}/${n}`,
    {
      organization: TEST_ORGANIZATION,
      project: projectName,
      name: n,
      dbaPassword: "passw0rd",
    },
  );
  return n;
}

export async function createBackupRest(
  projectName: string,
  databaseName: string,
  name?: string,
): Promise<string> {
  const n = name ?? shortUnique("b");
  await createResourceRest(
    "backups",
    `/${TEST_ORGANIZATION}/${projectName}/${databaseName}/${n}`,
    {
      organization: TEST_ORGANIZATION,
      project: projectName,
      database: databaseName,
      name: n,
    },
  );
  return n;
}

/** Returns existing project name if it exists, otherwise creates it. */
export async function getOrCreateProject(project: string): Promise<string> {
  try {
    await restApi("GET", `/projects/${TEST_ORGANIZATION}/${project}`);
    return project;
  } catch {
    return createProjectRest(project);
  }
}

/** Returns existing database name if it exists, otherwise creates it. */
export async function getOrCreateDatabase(
  project: string,
  database: string,
): Promise<string> {
  try {
    await restApi(
      "GET",
      `/databases/${TEST_ORGANIZATION}/${project}/${database}`,
    );
    return database;
  } catch {
    return createDatabaseRest(project, database);
  }
}
