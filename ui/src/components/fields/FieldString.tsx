// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import { FieldBase_display, FieldBase_validate, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';
import TextField from "../controls/TextField";

export default function FieldString(props: FieldProps): ReactNode {
    switch (props.op) {
        case "edit": return edit();
        case "view": return FieldBase_display(props);
        case "validate": return FieldBase_validate(props);
    }

    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    function edit(): ReactNode {
        const { prefix, label, values, errors, required, setValues, autoFocus, readonly, parameter } = props;
        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} required={required} id={prefix} label={label} description={parameter.description} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error} onBlur={() => FieldBase_validate(props)} disabled={readonly} />
    }
}