import React from "react";

/**
 * show Field of type String using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @returns
 */
export default function FieldHidden({ prefix, values }) {
    return <input type="hidden" id={prefix} name={prefix} value={values[prefix]} />
}
