import React from "react";
import TextField from '@mui/material/TextField'

/**
 * show Field of type String using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param required - does this field require a value?
 * @param onChange - callback to update field value
 * @returns
 */
export default function FieldPassword({ prefix, values, required, onChange }) {
    return <TextField type="password" required={required} id={prefix} name={prefix} label={prefix} value={values[prefix]} onChange={onChange} />
}
