import React from "react";
import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils.ts"
import FieldBase from "./FieldBase"

export default class FieldString extends FieldBase {
    /**
     * show Field of type String using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 hierarchical fields are hierarchical in the structure.
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required
     * @param setValues - callback to update field value
     * @returns
     */
    show() {
        const { prefix, values, errors, required, setValues, autoFocus } = this.props;
        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} fullWidth={true} required={required} id={prefix} name={prefix} label={prefix} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error !== ""} helperText={error} onBlur={event => this.validate()} />
    }
}