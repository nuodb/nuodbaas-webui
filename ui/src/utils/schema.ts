// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import Toast from "../components/controls/Toast";
import { Rest } from "../components/pages/parts/Rest";
import Auth from "./auth"
import { FieldValuesType, TempAny, SchemaType, FieldParametersType } from "./types";
let schema : TempAny = null;

/**
 * Pulls OpenAPI spec schema and parses it
 * @returns schema or null on error
 */
export async function getSchema() {
    if(!schema) {
        try {
            schema = await Rest.get("openapi");
            parseSchema(schema, schema, []);
            schema = schema["paths"];
            removeNoAccessPaths(schema);
            console.log("schema", schema);
        }
        catch(error) {
            console.log("ERROR", error);
            Auth.handle401Error(error);
        }
    }
    return schema;
}

/**
 * removes all the path / methods from the schema where the user doesn't have access
 * (without SLA verification to avoid network traffic)
 */
function removeNoAccessPaths(schema: any) : void {
    Object.keys(schema).forEach(path => {
        let atLeastOneMethod = false;
        Object.keys(schema[path]).forEach(method => {
            if(!Auth.hasAccess(method.toUpperCase() as "GET"|"PUT"|"PATCH"|"DELETE", path, undefined)) {
                delete schema[path][method];
            }
            else {
                atLeastOneMethod = true;
            }
        })
        if(!atLeastOneMethod) {
            delete schema[path];
        }
    });
}

/**
 * Parses Schema in place to prepare for UI handling.
 * It basically inlines all $ref fields
 * @param {*} rootSchema
 * @param {*} schema
 * @param {*} path
 */
function parseSchema(rootSchema:SchemaType, schema:SchemaType, path:string[]) {

    // remove all non-2xx responses (not relevant for the UI)
    if(path.length === 4 && path[0] === "paths" && path[3] === "responses") {
        Object.keys(schema).forEach(key => {
            if(parseInt(key) < 200 || parseInt(key) > 299) {
                delete schema[key];
            }
        })
    }

    // recursively inline $ref references
    Object.keys(schema).forEach(key => {
        if(key === "$ref" && (typeof schema[key] === "string") && schema[key].startsWith("#/")) {
            let child = getChild(rootSchema, schema[key].substring("#/".length));
            child = JSON.parse(JSON.stringify(child));
            delete schema[key];
            Object.keys(child).forEach(childKey => {
                schema[childKey] = child[childKey];
                parseSchema(rootSchema, schema[childKey], [...path, childKey]);
            })
        }
        else if(typeof schema[key] === 'object' && !Array.isArray(schema[key]) && schema[key] !== null) {
            parseSchema(rootSchema, schema[key], [...path, key]);
        }
        else if(typeof schema[key] === 'object' && Array.isArray(schema[key]) && schema[key] !== null) {
            for(let i=0; i<schema[key].length; i++) {
                parseSchema(rootSchema, schema[key][i], [...path, key]);
            }
        }
    });

    // remove all paths not part of the UI
    if(schema.keys) {
        Object.keys(schema.keys).forEach(key => {
            if(!("x-ui" in schema.keys[key])) {
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
export function matchesPath(path:string, schemaPath:string) : boolean {
    let partsPath = path.split("/");
    let partsSchemaPath = schemaPath.split("/");
    for (let i = 0; i < partsPath.length; i++) {
        if(partsSchemaPath.length === i) {
            return false;
        }
        const p = partsPath[i].endsWith("?") ? partsPath[i].substring(0, partsPath[i].length-1) : partsPath[i];
        const s = partsSchemaPath[i].endsWith("?") ? partsSchemaPath[i].substring(0, partsSchemaPath[i].length-1) : partsSchemaPath[i];
        const hasEndMarker = partsSchemaPath[i].endsWith("?");
        if(p !== s && !s.startsWith("{")) {
            return false;
        }
        if(i === partsPath.length - 1 && hasEndMarker) {
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
export function getSchemaPath(schema: SchemaType, path:string) : string|null {
    if(!schema) {
        return null
    }
    const ret = Object.keys(schema).filter(sPath => matchesPath(path, sPath));
    return ret.length === 1 ? ret[0] : null;
}

export function getOrgFromPath(schema: SchemaType, path: string) {
    let pathParts = path.split("/");
    const schemaParts = getSchemaPath(schema, path)?.split("/") || [];
    for(let i=0; i<pathParts.length && i<schemaParts.length; i++) {
        if(schemaParts[i] === "{organization}") {
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
export function replaceVariables(search: string, variables: TempAny) : string {
    Object.keys(variables).forEach(key => {
        search = search.replaceAll("{" + key + "}", variables[key]);
    })
    return search;
}

/**
 * returns a subset of the schema for the given path. This subset has the http method names
 * (i.e. get, post, delete) as keys and their values contain the parameter/field definitions.
 * @param {*} rootSchema
 * @param {*} path
 * @returns
 */
export function getResourceByPath(rootSchema: TempAny, path: string | null) : TempAny {
    if(!rootSchema || !path) {
        return [];
    }

    let retArray = Object.keys(rootSchema).filter(sPath => {
        return matchesPath(path, sPath);
    }).map(sPath => rootSchema[sPath]);
    if(retArray.length === 0) {
        return null;
    }
    else if(retArray.length === 1) {
        return retArray[0];
    }
    else {
        throw Error("Duplicate schema resources for path " + path);
    }
}

/**
 * finds path which can be used to create an entry. It finds the subpath having a PUT request
 * @param {*} rootSchema
 * @param {*} path
 * @returns full path or null if not found
 */
export function getCreatePath(rootSchema: TempAny, path: string) : string|null {
    if(!rootSchema) {
        return null;
    }

    let retPaths = Object.keys(rootSchema).filter(sPath => {
        let parts = path.split("/");
        let sParts = sPath.split("/");
        if(parts.length >= sParts.length) {
            return false;
        }
        for (let i = 0; i < parts.length; i++) {
            if(parts[i] !== sParts[i] && !sParts[i].startsWith("{")) {
                return false;
            }
        }
        return "put" in rootSchema[sPath];
    });
    if(retPaths.length === 0) {
        return null;
    }
    if(retPaths.length === 1) {
        return retPaths[0];
    }
    else {
        throw Error("Duplicate PUT child resources for path " + path);
    }
}

/**
 * returns field name which can be used as filter for this list
 * @param {*} rootSchema
 * @param {*} path
 * @returns full path or null if not found
 */
export function getFilterField(rootSchema: TempAny, path: string): string|null|string[] {
    if(!rootSchema) {
        return null;
    }

    let retPaths = Object.keys(rootSchema).filter(sPath => {
        let parts = path.split("/");
        let sParts = sPath.split("/");
        if(parts.length + 1 !== sParts.length) {
            return false;
        }
        for (let i = 0; i < parts.length; i++) {
            if(parts[i] !== sParts[i] && !sParts[i].startsWith("{")) {
                return false;
            }
        }
        return "get" in rootSchema[sPath];
    });
    if(retPaths.length === 0) {
        return null;
    }
    else if(retPaths.length === 1) {
        let hasChildPaths = false;
        Object.keys(rootSchema).forEach(key => {
            if(key.startsWith(retPaths[0] + "/") && key.endsWith("}")) {
                hasChildPaths = true;
            }
        })
        if(hasChildPaths) {
            const parts = retPaths[0].split("/");
            const lastPart = parts[parts.length-1];
            if(lastPart.startsWith("{") && lastPart.endsWith("}")) {
                return lastPart.substring(1, lastPart.length-1);
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
    else {
        // multiple schema definitions match the same path - return all the values
        // which may be used to provide a selection box with those values
        let ret:string[] = [];
        retPaths.forEach((retPath:string) => {
           const parts = retPath.split("/");
           ret.push(parts[parts.length-1]);
        });
        return ret;
    }
}

export function concatChunks(chunk1: Uint8Array<ArrayBuffer>, chunk2: Uint8Array<ArrayBuffer>) : Uint8Array<ArrayBuffer> {
    let ret = new Uint8Array(chunk1.length + chunk2.length);
    ret.set(chunk1, 0);
    ret.set(chunk2, chunk1.length);
    return ret;
}

let monitoredPaths = new Set<string>();

export function hasMonitoredPath(path: string) : boolean {
    return monitoredPaths.has(path.split("?")[0]);
}

/**
 * Gets event streaming resource by path (fall back to non-streaming resource on failure)
 * @param {*} path
 * @param {*} multiResolve - returns response
 * @param {*} multiReject - returns error
 * @returns AbortController - use ret.abort() to abort
 */
export function getResourceEvents(path: string, multiResolve: TempAny, multiReject: TempAny) {
    //only one event stream is supported - close prior one if it exists.
    let eventsAbortController = new AbortController();

    Rest.getStream(Auth.getNuodbCpRestUrl("events" + path), Auth.getHeaders(), eventsAbortController)
      .then(async (response: TempAny) => {
        monitoredPaths.add(path.split("?")[0]);
        let event = null;
        let data = null;
        let id = null;
        let mergedData: TempAny = {};
        let buffer = Uint8Array.of();
        for await (let chunk of response) {
            buffer = concatChunks(buffer, chunk);
            while(buffer.length > 0) {
                let posNewline = buffer.indexOf("\n".charCodeAt(0));
                if(posNewline === -1) {
                    break;
                }
                let line = new TextDecoder().decode(buffer.slice(0, posNewline));
                buffer = buffer.slice(posNewline+1);
                if(line.startsWith("event: ")) {
                    event = line.substring("event: ".length);
                }
                else if(line.startsWith("data: ")) {
                    data = line.substring("data: ".length);
                }
                else if(line.startsWith("id: ")) {
                    id = line.substring("id: ".length);
                }
                else if(line.length === 0) {
                    if(event === "HEARTBEAT") {
                        // ignore
                    }
                    else if(event === "RESYNC" && data !== null) {
                        mergedData = JSON.parse(data);
                        multiResolve(mergedData);
                    }
                    else if(event === "UPDATED" && id !== null && mergedData.items && data !== null) {
                        let newData: TempAny = {...mergedData};
                        newData.items = [...newData.items];
                        let modified = false;
                        for(let i=0; i<newData.items.length; i++) {
                            if(id === newData.items[i]["$ref"]) {
                                newData.items[i] = JSON.parse(data);
                                newData.items[i]["$ref"] = id;
                                modified = true;
                                break;
                            }
                        }
                        if(modified) {
                            mergedData = newData;
                            multiResolve(mergedData);
                        }
                        else {
                            console.error("item with id " + id + " not found for merging");
                        }
                    }
                    else if(event === "UPDATED" && data !== null && !mergedData.items) {
                        mergedData = JSON.parse(data);
                        multiResolve(mergedData);
                    }
                    else if(event === "DELETED" && id !== null && mergedData.items) {
                        let newData: TempAny = {...mergedData};
                        newData.items = [...newData.items];
                        let modified = false;
                        for(let i=0; i<newData.items.length; i++) {
                            if(id === newData.items[i]["$ref"]) {
                                newData.items[i] = {...newData.items[i], __deleted__: true};
                                modified = true;
                                break;
                            }
                        }
                        if(modified) {
                            mergedData = newData;
                            multiResolve(mergedData);
                        }
                    }
                    else if(event === "DELETED" && !mergedData.items) {
                        mergedData = {};
                        multiResolve(mergedData);
                    }
                    else if(event === "CREATED" && id !== null && data !== null) {
                        data = JSON.parse(data);
                        data["$ref"] = id;
                        mergedData = {...mergedData};
                        mergedData.items = [...mergedData.items];

                        let found = false;
                        for(let i=0; i<mergedData.items.length; i++) {
                            if(id === mergedData.items[i]["$ref"]) {
                                mergedData.items[i] = data;
                                delete mergedData.items[i]["__deleted__"];
                                found = true;
                                break;
                            }
                        }
                        if(!found) {
                            mergedData.items.push(data);
                        }
                        multiResolve(mergedData);
                    }
                    else {
                        console.log("Ignoring event " + event + ", id=" + id + ", data=" + data);
                    }

                    //clear out all data
                    event = null;
                    data = null;
                    id = null;
                }
                else {
                    console.log("Ignoring line " + line);
                }
            }
        }
      })
      .catch((error) => {
        if(error.status === 404) {
            // fall back to non-streaming request
            Rest.get(path)
                .then(data => multiResolve(data))
                .catch(reason => multiReject(reason));
        }
        else if(error.status) {
            Toast.show("Cannot retrieve resource for path " + path, error.status + " " + error.message);
        }
        else {
            //request was aborted. Ignore.
        }
      })
      .finally(()=>{
        monitoredPaths.delete(path.split("?")[0]);
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
    if(typeof pathParts === "string") {
        while(pathParts.startsWith("/")) {
            pathParts = pathParts.substring(1);
        }
        pathParts = pathParts.split("/");
    }
    try {
        for(let i=0; i<pathParts.length; i++) {
            schema = schema[pathParts[i]];
        }
        return schema;
    }
    catch(exception) {
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
    let ret:TempAny = {};
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
    if(value) {
        return value;
    }
    let type = parameter["type"];
    if(!type) {
        type = parameter["schema"] && parameter["schema"]["type"];
    }

    if(type === "object") {
        return null;
    }
    else if(type === "boolean") {
        return (parameter["schema"] && parameter["schema"]["default"]) || null;
    }
    else if(type === "array") {
        return [];
    }
    else if(type === "integer") {
        return "";
    }
    else {
        return null;
    }
}

/**
 * Delete fields with undefined, null or "" values. Also deletes empty Arrays or empty Objects.
 * @param {*} values
 */
function deleteEmptyFields(values: FieldValuesType) {
    if(typeof values === 'object' && !Array.isArray(values)) {
        Object.keys(values).forEach(key => {
            if(!values[key]) {
                // delete keys with undefined, null or empty values
                delete values[key];
            }
            else if(typeof values[key] === 'object') {
                if(!Array.isArray(values[key])) {
                    deleteEmptyFields(values[key]);
                    if(Object.keys(values[key]).length === 0) {
                        // Delete empty Objects
                        delete values[key];
                    }
                }
                else if(values[key].length === 0) {
                    // Delete empty arrays
                    delete values[key];
                }
            }
        });
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
export async function submitForm(urlParameters: FieldParametersType, formParameters: FieldParametersType, path: string, values: FieldValuesType) {
    let queryParameters = Object.keys(urlParameters).filter(key => urlParameters[key]["in"] === "query");

    // the last URL parameter has the name of the resource, while the form parameter always has "name"
    // rename last URL parameter to "name"
    let posBracketStart = path.lastIndexOf("{");
    let posBracketEnd = path.lastIndexOf("}");
    if(posBracketStart >= 0 && posBracketEnd > posBracketStart) {
        path = path.substring(0, posBracketStart+1) + "name" + path.substring(posBracketEnd);
    }

    // replace variables within the path
    Object.keys(values).forEach(key => {
        path = path.replace("{" + key + "}", String(values[key]));
    });

    // add query parameters to path
    queryParameters.forEach((query) => {
        let queryValue = undefined;
        if(query in values) {
            queryValue = values[query];
        }
        else {
            queryValue = urlParameters[query]?.schema?.default;
        }
        if(queryValue !== undefined) {
            path += path.includes("?") ? "&" : "?";
            path += encodeURIComponent(query) + "=" + encodeURIComponent(queryValue);
        }
    })

    values = {...values};
    Object.keys(values).forEach(key => {
        if(!(key in formParameters)) {
            //remove fields which are not used as form parameter
            delete values[key];
        }
    });

    deleteEmptyFields(values);

    return await Rest.put(path, values);
}