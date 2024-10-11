// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react'
import Select, { SelectOption } from '../controls/Select'

export default function FieldBoolean(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, values, required, setValues, autoFocus, readonly } = props;
        let value = getValue(values, prefix);
        return <Select id={prefix} value={String(value || false)} autoFocus={autoFocus} required={required} onChange={({ target: input }) => {
                let v = { ...values };
            setValue(v, prefix, input.value);
                setValues(v);
        }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
            <SelectOption value="true">True</SelectOption>
            <SelectOption value="false">False</SelectOption>
        </Select>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return value ? "true" : "false";
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
