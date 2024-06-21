import React from "react";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";

/**
 * show Field of type Array using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param setValues - callback to update field values
 * @returns
 */
export default function FieldArray({ prefix, parameter, values, setValues }) {
    let ret = [];
    for (let i = 0; i < values.length; i++) {
        let prefixKey = prefix + "." + i;
        ret.push(<Field key={prefixKey} name={prefixKey} parameter={parameter["items"]} values={values} setValues={setValues} />);
    }
    let prefixKey = prefix + "." + getValue(values, prefix).length;
    values = { ...values }
    setValue(values, prefixKey, getDefaultValue(parameter, getValue(values, prefixKey)));
    ret.push(<Field key={prefixKey} prefix={prefixKey} parameter={parameter["items"]} values={values} setValues={setValues} />);
    return ret;
}
