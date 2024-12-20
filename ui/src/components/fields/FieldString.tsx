// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';
import TextField from "../controls/TextField";

export default function FieldString(props: FieldProps): FieldBaseType {
    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, label, values, errors, required, setValues, autoFocus, readonly } = props;
        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} required={required} id={prefix} label={label} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error} onBlur={() => FieldBase(props).validate()} disabled={readonly} />
    }

    return { ...FieldBase(props), show };
}