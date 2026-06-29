// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import axios from "axios";
import { Rest } from "../components/pages/parts/Rest";
import Auth, { isBrowser } from "./auth";
import {
  FieldValuesType,
  TempAny,
  SchemaType,
  FieldParametersType,
  ResourcesType,
  DataType,
} from "./types";
import { getValue } from "../components/fields/utils";
let schema: TempAny = null;

/**
 * Pulls OpenAPI spec schema and parses it
 * @returns schema or null on error
 */
export async function getSchema() {
  if (!schema) {
    try {
      if (isBrowser()) {
        schema = await Rest.get("openapi");
      } else {
        schema = (
          await axios.get(Auth.getNuodbCpRestUrl("openapi"), {
            headers: Auth.getHeaders(),
          })
        ).data;
      }
      parseSchema(schema, schema, []);
      schema = schema["paths"];
      schema = filterAccessPaths(schema);
    } catch (error) {
      console.log("ERROR", error);
      Auth.handle401Error(error);
    }
  }
  return schema;
}

/**
 * filter all the path / methods from the schema where the user has access (+ parent resources "get" operation (for ?listAccessible=true))
 * (without SLA verification to avoid network traffic)
 * It also skips URL prefixes which are not relevant for the UI (/login, /healthz, /openapi)
 */
function filterAccessPaths(schema: any): void {
  const newSchema: any = {};
  const ignorePaths = ["/login", "/healthz", "/openapi"];

  // get all resources whe have access to directly
  Object.keys(schema).forEach((path) => {
    if (!ignorePaths.includes(path)) {
      Object.keys(schema[path]).forEach((method) => {
        if (
          Auth.hasAccess(
            method.toUpperCase() as "GET" | "PUT" | "PATCH" | "POST" | "DELETE",
            path,
            undefined,
          )
        ) {
          if (!newSchema[path]) {
            newSchema[path] = {};
          }
          newSchema[path] = {
            ...newSchema[path],
            [method]: JSON.parse(JSON.stringify(schema[path][method])),
          };
        }
      });
    }
  });

  // get all parent resources
  Object.keys(newSchema).forEach((path) => {
    let lastSlash;
    while ((lastSlash = path.lastIndexOf("/")) > 0) {
      path = path.substring(0, lastSlash);
      if (schema[path] && schema[path]["get"]) {
        if (!newSchema[path]) {
          newSchema[path] = {};
        }
        if (!newSchema[path].get) {
          newSchema[path] = {
            ...newSchema[path],
            get: JSON.parse(JSON.stringify(schema[path].get)),
          };
        }
      }
    }
  });
  return newSchema;
}

/**
 * Parses Schema in place to prepare for UI handling.
 * It basically inlines all $ref fields
 * @param {*} rootSchema
 * @param {*} schema
 * @param {*} path
 */
function parseSchema(
  rootSchema: SchemaType,
  schema: SchemaType,
  path: string[],
) {
  // remove all non-2xx responses (not relevant for the UI)
  if (path.length === 4 && path[0] === "paths" && path[3] === "responses") {
    Object.keys(schema).forEach((key) => {
      if (parseInt(key) < 200 || parseInt(key) > 299) {
        delete schema[key];
      }
    });
  }

  // recursively inline $ref references
  Object.keys(schema).forEach((key) => {
    if (
      key === "$ref" &&
      typeof schema[key] === "string" &&
      schema[key].startsWith("#/")
    ) {
      let child = getChild(rootSchema, schema[key].substring("#/".length));
      child = JSON.parse(JSON.stringify(child));
      delete schema[key];
      Object.keys(child).forEach((childKey) => {
        schema[childKey] = child[childKey];
        parseSchema(rootSchema, schema[childKey], [...path, childKey]);
      });
    } else if (
      typeof schema[key] === "object" &&
      !Array.isArray(schema[key]) &&
      schema[key] !== null
    ) {
      parseSchema(rootSchema, schema[key], [...path, key]);
    } else if (
      typeof schema[key] === "object" &&
      Array.isArray(schema[key]) &&
      schema[key] !== null
    ) {
      for (let i = 0; i < schema[key].length; i++) {
        parseSchema(rootSchema, schema[key][i], [...path, key]);
      }
    }
  });

  // remove all paths not part of the UI
  if (schema.keys) {
    Object.keys(schema.keys).forEach((key) => {
      if (!("x-ui" in schema.keys[key])) {
        delete schema.keys[key];
      }
    });
  }
}

/**
 * Checks if both path's match. Placeholders within a path component ("{parameter}") always match.
 * if there is a question mark ("?") in the schema path, everything afterwards could be optionally ignored
 * Examples: path: /a/b/c matches /a/b/c, /a/b/{param1}, /a/b/{param1}?/{param2}, /a/{param1}/{param2}
 * @param {*} path
 * @param {*} schemaPath
 * @returns
 */
export function matchesPath(path: string, schemaPath: string): boolean {
  const partsPath = path.split("/");
  const partsSchemaPath = schemaPath.split("/");
  for (let i = 0; i < partsPath.length; i++) {
    if (partsSchemaPath.length === i) {
      return false;
    }
    const p = partsPath[i].endsWith("?")
      ? partsPath[i].substring(0, partsPath[i].length - 1)
      : partsPath[i];
    const s = partsSchemaPath[i].endsWith("?")
      ? partsSchemaPath[i].substring(0, partsSchemaPath[i].length - 1)
      : partsSchemaPath[i];
    const hasEndMarker = partsSchemaPath[i].endsWith("?");
    if (p !== s && !s.startsWith("{")) {
      return false;
    }
    if (i === partsPath.length - 1 && hasEndMarker) {
      return true;
    }
  }
  return partsPath.length === partsSchemaPath.length;
}

/**
 * Given a path, gets the path definition in the schema path (basically replacing path parts with the placeholders)
 * For example /backuppolicies/acme/policy1/backups returns /backuppolicies/{organization}/{project}/backups
 * @param {*} schema
 * @param {*} path
 * @returns
 */
export function getSchemaPath(schema: SchemaType, path: string): string | null {
  if (!schema) {
    return null;
  }
  const ret = Object.keys(schema).filter((sPath) => matchesPath(path, sPath));
  return ret.length === 1 ? ret[0] : null;
}

export function getOrgFromPath(schema: SchemaType, path: string) {
  const pathParts = path.split("/");
  const schemaParts = getSchemaPath(schema, path)?.split("/") || [];
  for (let i = 0; i < pathParts.length && i < schemaParts.length; i++) {
    if (schemaParts[i] === "{organization}") {
      return pathParts[i];
    }
  }
  return "";
}

/**
 * given a search string, replaces all placeholders "{variable}" with the value of the variable
 * @param {*} search
 * @param {*} variables
 * @returns string with the placeholders replaced.
 */
export function replaceVariables(
  search: string,
  variables: TempAny,
  urlEncode: boolean,
): string {
  let posOpenBracket;
  while ((posOpenBracket = search.indexOf("{")) !== -1) {
    const posCloseBracket = search.indexOf("}", posOpenBracket + 1);
    if (posCloseBracket === -1) {
      //missing close bracket - this shouldn't occur - just get rid of the open bracket
      search =
        search.substring(0, posOpenBracket) +
        search.substring(posOpenBracket + 1);
    } else {
      let value =
        getValue(
          variables,
          search.substring(posOpenBracket + 1, posCloseBracket),
        ) || "";
      if (urlEncode) {
        value = encodeURIComponent(value);
      }
      search =
        search.substring(0, posOpenBracket) +
        value +
        search.substring(posCloseBracket + 1);
    }
  }
  return search;
}

/**
 * returns a subset of the schema for the given path. This subset has the http method names
 * (i.e. get, post, delete) as keys and their values contain the parameter/field definitions.
 * @param {*} rootSchema
 * @param {*} path
 * @returns
 */
export function getResourceByPath(
  rootSchema: TempAny,
  path: string | null,
): TempAny {
  if (!rootSchema || !path) {
    return [];
  }

  const retArray = Object.keys(rootSchema)
    .filter((sPath) => {
      return matchesPath(path, sPath);
    })
    .map((sPath) => rootSchema[sPath]);
  if (retArray.length === 0) {
    return null;
  } else if (retArray.length === 1) {
    return retArray[0];
  } else {
    throw Error("Duplicate schema resources for path " + path);
  }
}

/**
 * finds path which can be used to create an entry. It finds the subpath having a PUT request
 * @param {*} rootSchema
 * @param {*} path
 * @returns full path or null if not found
 */
export function getCreatePath(
  rootSchema: TempAny,
  path: string,
): string | null {
  if (!rootSchema) {
    return null;
  }

  const retPaths = Object.keys(rootSchema).filter((sPath) => {
    const parts = path.split("/");
    const sParts = sPath.split("/");
    if (parts.length >= sParts.length) {
      return false;
    }
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== sParts[i] && !sParts[i].startsWith("{")) {
        return false;
      }
    }
    return "put" in rootSchema[sPath];
  });
  if (retPaths.length === 0) {
    return null;
  }
  if (retPaths.length === 1) {
    return retPaths[0];
  } else {
    throw Error("Duplicate PUT child resources for path " + path);
  }
}

/**
 * finds path which can be used to view a single entry. It finds the subpath having the longest path
 * in a GET request and ending with a placeholder (i.e. {})
 * @param {*} rootSchema
 * @param {*} path
 * @returns full path or null if not found
 */
export function getEntryPath(rootSchema: TempAny, path: string): string | null {
  if (!rootSchema) {
    return null;
  }

  let retPath = "";
  const parts = path.split("/");
  Object.keys(rootSchema).forEach((sPath) => {
    const sParts = sPath.split("/");
    if (parts.length >= sParts.length) {
      return;
    }
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== sParts[i] && !sParts[i].startsWith("{")) {
        return;
      }
    }
    if (
      retPath.length < sPath.length &&
      "get" in rootSchema[sPath] &&
      sPath[sPath.length - 1].endsWith("}")
    ) {
      retPath = sPath;
    }
  });
  if (!retPath) {
    return null;
  } else {
    return retPath;
  }
}

/**
 * returns field name which can be used as filter for this list
 * @param {*} rootSchema
 * @param {*} path
 * @returns full path or null if not found
 */
export function getFilterField(
  rootSchema: TempAny,
  path: string,
): string | null | string[] {
  if (!rootSchema) {
    return null;
  }

  const retPaths = Object.keys(rootSchema).filter((sPath) => {
    const parts = path.split("/");
    const sParts = sPath.split("/");
    if (parts.length + 1 !== sParts.length) {
      return false;
    }
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] !== sParts[i] && !sParts[i].startsWith("{")) {
        return false;
      }
    }
    return "get" in rootSchema[sPath];
  });
  if (retPaths.length === 0) {
    return null;
  } else if (retPaths.length === 1) {
    let hasChildPaths = false;
    Object.keys(rootSchema).forEach((key) => {
      if (key.startsWith(retPaths[0] + "/") && key.endsWith("}")) {
        hasChildPaths = true;
      }
    });
    if (hasChildPaths) {
      const parts = retPaths[0].split("/");
      const lastPart = parts[parts.length - 1];
      if (lastPart.startsWith("{") && lastPart.endsWith("}")) {
        return lastPart.substring(1, lastPart.length - 1);
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else {
    // multiple schema definitions match the same path - return all the values
    // which may be used to provide a selection box with those values
    const ret: string[] = [];
    retPaths.forEach((retPath: string) => {
      const parts = retPath.split("/");
      ret.push(parts[parts.length - 1]);
    });
    return ret;
  }
}

export function concatChunks(
  chunk1: Uint8Array<ArrayBuffer>,
  chunk2: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
  const ret = new Uint8Array(chunk1.length + chunk2.length);
  ret.set(chunk1, 0);
  ret.set(chunk2, chunk1.length);
  return ret;
}

let eventTransaction = 0;

let monitored:
  | undefined
  | { abort: AbortController; transactionNumber: number } = undefined;
export function hasActiveStream(): boolean {
  return !!monitored;
}

/**
 * Gets event streaming resource by path (fall back to non-streaming resource on failure)
 * @param {*} path
 * @param {*} multiResolve - returns response
 * @param {*} multiReject - returns error
 * @param {*} multiAbort - notification if connection was aborted / canceled
 * @returns AbortController - use ret.abort() to abort
 */
export function getResourceEvents(
  schema: any,
  path: string,
  multiResolve: (
    resources: ResourcesType,
    type?: "created" | "updated" | "deleted",
    resource?: DataType,
  ) => void,
  multiReject: TempAny,
  multiAbort: () => void,
  transactionNumber: number = -1,
) {
  //only one event stream is supported - close prior one if it exists.
  const eventsAbortController = new AbortController();

  let hasEventsAccess = false;
  Object.keys(schema).forEach((schemaPath) => {
    if (matchesPath("/events" + path.split("?")[0], schemaPath)) {
      hasEventsAccess = true;
    }
  });

  if (!hasEventsAccess) {
    Rest.get(path)
      .then((data) => multiResolve(data as ResourcesType))
      .catch((reason) => multiReject(reason));
    return;
  }

  // increment transaction number and abort existing ones on same path
  if (monitored && monitored.transactionNumber !== transactionNumber) {
    // this is a different request on the same resource - abort the prior one
    monitored.abort.abort();
  }
  if (transactionNumber === -1) {
    eventTransaction++;
    transactionNumber = eventTransaction;
  }

  Rest.getStream(
    Auth.getNuodbCpRestUrl("events" + path),
    Auth.getHeaders(),
    eventsAbortController,
  )
    .then(async (response: TempAny) => {
      monitored = { abort: eventsAbortController, transactionNumber };
      let event = null;
      let data = null;
      let id: string = "";
      let mergedData: ResourcesType = { items: [] };
      let buffer = Uint8Array.of();
      for await (const chunk of response) {
        buffer = concatChunks(buffer, chunk);
        while (buffer.length > 0) {
          const posNewline = buffer.indexOf("\n".charCodeAt(0));
          if (posNewline === -1) {
            break;
          }
          const line = new TextDecoder().decode(buffer.slice(0, posNewline));
          buffer = buffer.slice(posNewline + 1);
          if (line.startsWith("event: ")) {
            event = line.substring("event: ".length);
          } else if (line.startsWith("data: ")) {
            data = line.substring("data: ".length);
          } else if (line.startsWith("id: ")) {
            id = line.substring("id: ".length);
          } else if (line.length === 0) {
            if (event === "HEARTBEAT" || !data) {
              // ignore
            } else if (event === "RESYNC") {
              mergedData = JSON.parse(data);
              mergedData.items = mergedData.items || [];
              multiResolve(mergedData);
            } else if (!id) {
              // ignore
            } else if (event === "UPDATED") {
              const foundIndex = mergedData.items.findIndex(
                (item: DataType) => item["$ref"] === id,
              );
              if (foundIndex !== -1) {
                mergedData.items[foundIndex] = {
                  ...JSON.parse(data),
                  ["$isNew"]: mergedData.items[foundIndex]["$isNew"],
                  ["$ref"]: id,
                };
                multiResolve(mergedData);
              } else {
                multiResolve(mergedData, "updated", {
                  ...JSON.parse(data),
                  ["$ref"]: id,
                });
              }
            } else if (event === "DELETED" && id !== null) {
              const foundIndex = mergedData.items.findIndex(
                (item: DataType) => item["$ref"] === id,
              );
              if (foundIndex !== -1) {
                mergedData.items.splice(foundIndex, 1);
                multiResolve(mergedData);
              } else {
                multiResolve(mergedData, "deleted", { ["$ref"]: id });
              }
            } else if (event === "CREATED" && id !== null && data !== null) {
              data = JSON.parse(data);
              data["$ref"] = id;
              data["$isNew"] = true;
              mergedData.items = [data, ...mergedData.items];
              multiResolve(mergedData);
            } else {
              console.log(
                "Ignoring event " + event + ", id=" + id + ", data=" + data,
              );
            }

            //clear out all data
            event = null;
            data = null;
            id = "";
          } else {
            console.log("Ignoring line " + line);
          }
        }
      }
      if (monitored && monitored.transactionNumber === transactionNumber) {
        monitored = undefined;
      }
    })
    .catch((error) => {
      if (error.status === 404) {
        // fall back to non-streaming request
        Rest.get(path)
          .then((data) => multiResolve(data as ResourcesType))
          .catch((reason) => multiReject(reason));
      } else if (error.status === 400) {
        multiReject(error);
      } else if (error.code === "ERR_CANCELED") {
        // noop - canceled due to new request
      } else {
        // request failed (i.e. network error). Send Abort notification
        multiAbort();
      }
    });

  return eventsAbortController;
}

/**
 * returns a child schema from the path provided
 * @param {*} schema
 * @param {*} pathParts a path separated by slashes or an array of path components
 * @returns
 */
export function getChild(schema: TempAny, pathParts: string | string[]) {
  if (typeof pathParts === "string") {
    while (pathParts.startsWith("/")) {
      pathParts = pathParts.substring(1);
    }
    pathParts = pathParts.split("/");
  }
  try {
    for (let i = 0; i < pathParts.length; i++) {
      schema = schema[pathParts[i]];
    }
    return schema;
  } catch {
    return null;
  }
}

/**
 * convert an array of objects to an object with keys taken from a specific field of the child objects
 * @param {*} array array of objects. All objects must contain a field specified by the "key" parameter
 * @param {*} key
 * @returns
 */
export function arrayToObject(array: TempAny, key: string): TempAny {
  const ret: TempAny = {};
  array.forEach((a: TempAny) => {
    ret[a[key]] = a;
  });
  return ret;
}

/**
 * get the default value according to the schema's parameter field
 * @param {*} parameter
 * @param {*} value
 * @returns
 */
export function getDefaultValue(parameter: TempAny, value: TempAny) {
  if (value) {
    return value;
  }
  let type = parameter["type"];
  if (!type) {
    type = parameter["schema"] && parameter["schema"]["type"];
  }

  if (type === "object") {
    return null;
  } else if (type === "boolean") {
    return (parameter["schema"] && parameter["schema"]["default"]) || null;
  } else if (type === "array") {
    return [];
  } else if (type === "integer") {
    return "";
  } else {
    return null;
  }
}

/**
 * Delete fields with undefined, null or "" values. Also deletes empty Arrays or empty Objects.
 * @param {*} values
 */
function deleteEmptyFields(values: FieldValuesType) {
  if (typeof values === "object" && !Array.isArray(values)) {
    Object.keys(values).forEach((key) => {
      if (!values[key]) {
        // delete keys with undefined, null or empty values
        delete values[key];
      } else if (typeof values[key] === "object") {
        if (!Array.isArray(values[key])) {
          deleteEmptyFields(values[key]);
          if (Object.keys(values[key]).length === 0) {
            // Delete empty Objects except for "accessRule"
            if (key !== "accessRule") {
              delete values[key];
            }
          }
        } else {
          for (let i = 0; i < values[key].length; i++) {
            deleteEmptyFields(values[key]);
          }
          if (values[key].length === 0) {
            // Delete empty arrays
            delete values[key];
          }
        }
      }
    });
  } else if (typeof values === "object" && Array.isArray(values)) {
    for (let i = 0; i < values.length; i++) {
      deleteEmptyFields(values[i]);
    }
  }
}

/**
 * sends form
 * @param {*} urlParameters
 * @param {*} formParameters
 * @param {*} path
 * @param {*} values
 * @returns
 */
export async function submitForm(
  urlParameters: FieldParametersType,
  formParameters: FieldParametersType,
  path: string,
  values: FieldValuesType,
) {
  const queryParameters = Object.keys(urlParameters).filter(
    (key) => urlParameters[key]["in"] === "query",
  );

  // the last URL parameter has the name of the resource, while the form parameter always has "name"
  // rename last URL parameter to "name"
  const posBracketStart = path.lastIndexOf("{");
  const posBracketEnd = path.lastIndexOf("}");
  if (posBracketStart >= 0 && posBracketEnd > posBracketStart) {
    path =
      path.substring(0, posBracketStart + 1) +
      "name" +
      path.substring(posBracketEnd);
  }

  // replace variables within the path
  Object.keys(values).forEach((key) => {
    path = path.replace("{" + key + "}", String(values[key]));
  });

  // add query parameters to path
  queryParameters.forEach((query) => {
    let queryValue = undefined;
    if (query in values) {
      queryValue = values[query];
    } else {
      queryValue = urlParameters[query]?.schema?.default;
    }
    if (queryValue !== undefined) {
      path += path.includes("?") ? "&" : "?";
      path += encodeURIComponent(query) + "=" + encodeURIComponent(queryValue);
    }
  });

  values = { ...values };
  Object.keys(values).forEach((key) => {
    if (!(key in formParameters)) {
      //remove fields which are not used as form parameter
      delete values[key];
    }
  });

  deleteEmptyFields(values);

  return await Rest.put(path, values);
}
