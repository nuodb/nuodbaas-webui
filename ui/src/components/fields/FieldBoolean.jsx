import React from "react";
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'

/**
 * show Field of type Boolean using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param onChange - callback to update field value
 * @returns
 */
export default function FieldBoolean({ prefix, values, required, onChange }) {
    if (values[prefix] === undefined) {
        return null;
    }
    return <FormControl fullWidth>
        <InputLabel id={"label_" + prefix}>{prefix}</InputLabel>
        <Select labelId={"label_" + prefix} id={prefix} name={prefix} value={String(values[prefix]) || "false"} label={prefix} onChange={onChange}>
            <MenuItem value="true">True</MenuItem>
            <MenuItem value="false">False</MenuItem>
        </Select>
        {required && <span>Required</span>}
    </FormControl>;
}
