import React from "react";
import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"

/**
 * show Field of type String using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param required - does this field require a value?
 * @param setValues - callback to update field value
 * @param onExit onExit callback. The field prefix is passed in as first argument
 * @returns
 */
export default function FieldPassword({ prefix, values, errors, required, setValues, onExit }) {
    let value = String(getValue(values, prefix) || "");
    let error = (errors && (prefix in errors) && errors[prefix]) || "";
    return <TextField type="password" required={required} id={prefix} name={prefix} label={prefix} value={value} onChange={({ currentTarget: input }) => {
        let v = { ...values };
        setValue(v, prefix, input.value);
        setValues(v);
    }} error={error !== ""} helperText={error} onBlur={event => onExit && onExit(prefix)} />
}
