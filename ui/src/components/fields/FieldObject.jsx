import React from "react";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";

/**
 * show Field of type Object using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param setValues - callback to update field values
 * @returns
 */
export default function FieldObject({ prefix, parameter, values, setValues }) {
    return Object.keys(parameter).map(key => {
        let prefixKey = prefix ? (prefix + "." + key) : key;
        let defaultValue = getDefaultValue(parameter[key], values && getValue(values, prefixKey));
        if (defaultValue !== null) {
            setValue(values, prefixKey, defaultValue);
        }
        return <Field key={prefixKey} prefix={prefixKey} parameter={parameter[key]} values={values} setValues={setValues} />
    });
}
