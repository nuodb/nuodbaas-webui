import React from "react";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";

/**
 * show Field of type Object using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param onChange - callback to update field value
 * @returns
 */
export default function FieldObject({ prefix, parameter, values, onChange }) {
    return Object.keys(parameter).map(key => {
        let prefixKey = prefix + "." + key;
        if (!(prefixKey in values)) {
            let defaultValue = getDefaultValue(parameter[key], values && values[key]);
            if (defaultValue !== null) {
                values[prefixKey] = defaultValue;
            }
        }
        return <Field key={prefixKey} prefix={prefixKey} parameter={parameter[key]} values={values} onChange={onChange} />
    });
}
