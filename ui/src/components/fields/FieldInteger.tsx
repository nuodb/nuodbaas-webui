// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import TextField from "../controls/TextField";
import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';

export default function FieldInteger(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Integer using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, label, values, required, setValues, autoFocus, readonly, parameter } = props;
        let value = String(getValue(values, prefix) || "");

        return <TextField key={prefix} required={required} id={prefix} label={label} description={parameter.description} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(values, prefix, input.value);
            setValues(v);
        }} disabled={readonly} />
    }

    return { ...FieldBase(props), show };
}