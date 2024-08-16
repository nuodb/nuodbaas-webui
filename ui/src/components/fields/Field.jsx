import React from "react";

import FieldString from "./FieldString";
import FieldHidden from "./FieldHidden";
import FieldPassword from "./FieldPassword";
import FieldBoolean from "./FieldBoolean";
import FieldObject from "./FieldObject";
import FieldMap from "./FieldMap";
import FieldArray from "./FieldArray";
import FieldInteger from "./FieldInteger";

/**
 * show one Field of any type using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param setValues - callback to update field values
 * @returns
 */
export default function Field({ prefix, parameter, values, errors, setValues, onExit }) {
    let leftOvers = JSON.parse(JSON.stringify(parameter));
    if (!("schema" in leftOvers)) {
        leftOvers["schema"] = {};
    }

    function get(key1, key2) {
        if (!key2) {
            let ret = leftOvers[key1];
            delete leftOvers[key1];
            return ret;
        }
        else {
            let ret = leftOvers[key1][key2];
            delete leftOvers[key1][key2];
            return ret;
        }
    }

    function dumpLeftovers() {
        if (Object.keys(leftOvers["schema"]).length === 0) {
            delete leftOvers["schema"];
        }
        if (Object.keys(leftOvers).length > 0) {
            console.log("LEFTOVERS", leftOvers);
        }
    }

    let in_ = get("in");
    if (in_ && in_ !== "path" && in_ !== "query") {
        throw new Error("Invalid IN value " + in_);
    }

    let required = get("required");

    let type = get("type")
    if (!type) {
        type = get("schema", "type");
    }

    false && dumpLeftovers();

    if (type === "string") {
        if (prefix === "resourceVersion") {
            return <FieldHidden prefix={prefix} values={values} errors={errors} />;
        }
        else if (prefix.toLowerCase().includes("password")) {
            return <FieldPassword prefix={prefix} values={values} errors={errors} required={required} setValues={setValues} onExit={onExit} />;
        }
        else {
            return <FieldString prefix={prefix} values={values} errors={errors} required={required} setValues={setValues} onExit={onExit} />;
        }
    }
    else if (type === "boolean") {
        return <FieldBoolean prefix={prefix} values={values} errors={errors} required={required} setValues={setValues} onExit={onExit} />;
    }
    else if (type === "object") {
        if (parameter["properties"]) {
            return <FieldObject prefix={prefix} parameter={parameter["properties"]} values={values} errors={errors} setValues={setValues} onExit={onExit} />;
        }
        else if (parameter["additionalProperties"]) {
            return <FieldMap prefix={prefix} parameter={parameter["additionalProperties"]} values={values} errors={errors} setValues={setValues} onExit={onExit} />;
        }
        else {
            console.log("ERROR: Invalid object", prefix, parameter);
            if (process && process.env && process.env.NODE_ENV === "development") {
                return <h1>ERROR: Invalid object</h1>;
            }
            else {
                return null;
            }
        }
    }
    else if (type === "array") {
        return <FieldArray prefix={prefix} parameter={parameter} values={values} errors={errors} setValues={setValues} onExit={onExit} />;
    }
    else if (type === "integer") {
        return <FieldInteger prefix={prefix} values={values} required={required} errors={errors} setValues={setValues} onExit={onExit} />;
    }
    else {
        return <h3>Invalid type {String(type)} {JSON.stringify(parameter)} {JSON.stringify(leftOvers)}</h3>;
    }
}
