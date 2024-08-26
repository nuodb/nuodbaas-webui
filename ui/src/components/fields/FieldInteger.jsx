import React from "react";
import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"

export default class FieldInteger {
    constructor(props) {
        this.props = props;
    }

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
        const { prefix, values, required, setValues } = this.props;
        let value = String(getValue(values, prefix) || "");

        return <TextField required={required} id={prefix} name={prefix} label={prefix} value={value} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(values, prefix, input.value);
            setValues(v);
        }} />
    }
}