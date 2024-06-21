import axios from "axios";
import Auth from "./auth";

let schema;

/**
 * Pulls OpenAPI spec schema and parses it
 * @returns schema or null on error
 */
export async function getSchema() {
    if(!schema) {
        try {
            schema = (await axios.get("/api/openapi", { headers: Auth.getHeaders() })).data;
            parseSchema(schema, schema, []);
            schema = schema["paths"];
        }
        catch(error) {
            Auth.handle401Error(error);
        }
    }
    return schema;
}

/**
 * Parses Schema in place to prepare for UI handling.
 * It basically inlines all $ref fields
 * @param {*} rootSchema
 * @param {*} schema
 * @param {*} path
 */
function parseSchema(rootSchema, schema, path) {

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
 * @param {*} path1
 * @param {*} path2
 * @returns
 */
function matchesPath(path1, path2) {
    let parts1 = path1.split("/");
    let parts2 = path2.split("/");
    if(parts1.length !== parts2.length) {
        return false;
    }
    for (let i = 0; i < parts1.length; i++) {
        if(parts1[i] !== parts2[i] && !parts1[i].startsWith("{") && !parts2[i].startsWith("{")) {
            return false;
        }
    }
    return true;
}

/**
 * returns object with all the method names as key for the specified path
 * @param {*} rootSchema
 * @param {*} path
 * @returns
 */
export function getResourceByPath(rootSchema, path) {
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
export function getCreatePath(rootSchema, path) {
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
export function getFilterField(rootSchema, path) {
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
    if(retPaths.length === 1) {
        let hasChildPaths = false;
        Object.keys(rootSchema).forEach(key => {
            if(key.startsWith(retPaths[0] + "/") && key.endsWith("}")) {
                hasChildPaths = true;
            }
        })
        if(hasChildPaths) {
            let ret = retPaths[0].split("/");
            ret = ret[ret.length-1];
            if(ret.startsWith("{") && ret.endsWith("}")) {
                return ret.substring(1, ret.length-1);
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
        throw Error("Duplicate GET child resources for path " + path);
    }
}

/**
 * Gets a resource by path
 * @param {*} path
 * @returns
 */
export async function getResource(path) {
    let fullPath = "/api" + path;
    return new Promise((resolve, reject) => {
        axios.get(fullPath, { headers: Auth.getHeaders() })
            .then(response => resolve(response.data))
            .catch(reason => reject(reason));
    });
}

/**
 * Deletes a resource by path
 * @param {*} path
 * @returns
 */
export async function deleteResource(path) {
    return new Promise((resolve, reject) => {
        axios.delete("/api/" + path, { headers: Auth.getHeaders() }).then(response => resolve(response.data)).catch(reason => reject(reason));
    })
}

/**
 * returns a child schema from the path provided
 * @param {*} schema
 * @param {*} pathParts a path separated by slashes or an array of path components
 * @returns
 */
export function getChild(schema, pathParts) {
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
export function arrayToObject(array, key) {
    let ret = {};
    array.forEach(a => {
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
export function getDefaultValue(parameter, value) {
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
 * sends form
 * @param {*} urlParameters
 * @param {*} formParameters
 * @param {*} path
 * @param {*} values
 * @returns
 */
export async function submitForm(urlParameters, formParameters, path, values) {
    let queryParameters = Object.keys(urlParameters).filter(key => urlParameters[key]["in"] === "query");
    let fullPath = "/api" + path;

    // the last URL parameter has the name of the resource, while the form parameter always has "name"
    // rename last URL parameter to "name"
    let posBracketStart = fullPath.lastIndexOf("{");
    let posBracketEnd = fullPath.lastIndexOf("}");
    if(posBracketStart >= 0 && posBracketEnd > posBracketStart) {
        fullPath = fullPath.substring(0, posBracketStart+1) + "name" + fullPath.substring(posBracketEnd);
    }

    queryParameters.forEach((query, index) => {
        if(index === 0) {
            fullPath += "?";
        }
        else {
            fullPath += "&";
        }
        fullPath += encodeURIComponent(query) + "={" + query + "}";
    })
    Object.keys(values).forEach(key => {
        fullPath = fullPath.replace("{" + key + "}", String(values[key]));
    });

    return new Promise((resolve, reject) => {
        axios.put(fullPath, values, { headers: Auth.getHeaders() })
            .then(response => resolve(response.data))
            .catch(error => { return reject(error)})
    });

}