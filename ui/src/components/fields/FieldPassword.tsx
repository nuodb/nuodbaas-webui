// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';

export default function FieldPassword(props: FieldProps): FieldBaseType {

    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        let { prefix, values, errors, required, setValues, autoFocus, readonly } = props;
        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} type="password" required={required} id={prefix} name={prefix} label={prefix} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error !== ""} helperText={error} onBlur={event => FieldBase(props).validate()} disabled={readonly} />
    }

    return { ...FieldBase(props), show };
}