import React from "react";
import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils.ts"
import FieldBase from "./FieldBase"

export default class FieldInteger extends FieldBase {

    /**
     * show Field of type Integer using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param setValues - callback to update field values
     * @returns
     */
    show() {
        const { prefix, values, required, setValues, autoFocus } = this.props;
        let value = String(getValue(values, prefix) || "");

        return <TextField key={prefix} required={required} id={prefix} name={prefix} label={prefix} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(values, prefix, input.value);
            setValues(v);
        }} />
    }
}