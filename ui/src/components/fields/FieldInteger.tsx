// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';

export default function FieldInteger(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Integer using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, values, required, setValues, autoFocus, readonly } = props;
        let value = String(getValue(values, prefix) || "");

        return <TextField key={prefix} required={required} id={prefix} name={prefix} label={prefix} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(values, prefix, input.value);
            setValues(v);
        }} disabled={readonly} />
    }

    return { ...FieldBase(props), show };
}