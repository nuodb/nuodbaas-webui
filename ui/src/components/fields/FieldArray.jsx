import React from "react";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";

/**
 * show Field of type Array using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param onChange - callback to update field value
 * @returns
 */
export default function FieldArray({ prefix, parameter, values, onChange }) {
    let ret = [];
    for (let i = 0; i < values.length; i++) {
        let prefixKey = prefix + "." + i;
        ret.push(<Field key={prefixKey} name={prefixKey} parameter={parameter["items"]} values={values} onChange={onChange} />);
    }
    let prefixKey = prefix + "." + values[prefix].length;
    values = { ...values }
    values[prefixKey] = getDefaultValue(parameter, values[prefixKey]);
    ret.push(<Field key={prefixKey} prefix={prefixKey} parameter={parameter["items"]} values={values} onChange={onChange} />);
    return ret;
}
