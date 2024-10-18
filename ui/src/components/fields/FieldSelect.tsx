// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react'
import Select, { SelectOption } from "../controls/Select";

export default function FieldSelect(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, label, values, parameter, required, setValues, autoFocus, readonly } = props;
        let value = getValue(values, prefix);

        return <Select id={prefix} key={prefix} label={label} value={value} autoFocus={autoFocus} required={required} onChange={(e: any) => {
            let v = { ...values };
            setValue(v, prefix, e.target.value);
            setValues(v);
        }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
            <SelectOption value="">--- Select Item ---</SelectOption>
            {parameter && parameter.enums && parameter.enums.map(e => <SelectOption key={e.key} value={e.key}>{e.label}</SelectOption>)}
        </Select>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return value ? "true" : "false";
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
