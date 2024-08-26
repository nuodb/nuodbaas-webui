import React from "react";
import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"
import FieldBase from "./FieldBase"

export default class FieldPassword extends FieldBase {

    /**
     * show Field of type String using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required - does this field require a value?
     * @param setValues - callback to update field value
     * @returns
     */
    show() {
        let { prefix, values, errors, required, setValues } = this.props;
        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField type="password" required={required} id={prefix} name={prefix} label={prefix} value={value} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error !== ""} helperText={error} onBlur={event => this.validate()} />
    }
}