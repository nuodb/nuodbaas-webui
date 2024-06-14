import React from "react";
import TextField from '@mui/material/TextField'

/**
 * show Field of type Integer using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param onChange - callback to update field value
 * @returns
 */
export default function FieldInteger({ prefix, values, required, onChange }) {
    return <TextField required={required} id={prefix} name={prefix} label={prefix} value={String(values[prefix])} onChange={({ target }) => {
        target = { name: target.name, value: target.value };
        if (target.value === "") {
            onChange({ target });
        } else if (!isNaN(target.value)) {
            target.value = parseInt(target.value);
            onChange({ target })
        }
    }} />
}
