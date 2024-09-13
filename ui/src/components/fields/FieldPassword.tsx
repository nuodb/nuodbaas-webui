// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"
import FieldBase from "./FieldBase"

export default class FieldPassword extends FieldBase {

    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    show() {
        let { prefix, values, errors, required, setValues, autoFocus } = this.props;
        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} type="password" required={required} id={prefix} name={prefix} label={prefix} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error !== ""} helperText={error} onBlur={event => this.validate()} />
    }
}