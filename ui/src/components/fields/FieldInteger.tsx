// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"
import FieldBase from "./FieldBase"

export default class FieldInteger extends FieldBase {

    /**
     * show Field of type Integer using the values and schema definition
     * @returns
     */
    show() {
        const { prefix, values, required, setValues, autoFocus, readonly } = this.props;
        let value = String(getValue(values, prefix) || "");

        return <TextField key={prefix} required={required} id={prefix} name={prefix} label={prefix} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(values, prefix, input.value);
            setValues(v);
        }} disabled={readonly} />
    }
}