// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react'
import Select, { SelectOption } from '../controls/Select'

export default function FieldBoolean(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, label, values, required, setValues, autoFocus, readonly, parameter, t } = props;
        let value = getValue(values, prefix);
        return <Select id={prefix} key={prefix} label={label} description={parameter.description} value={String(value || false)} autoFocus={autoFocus} required={required} onChange={({ target: input }) => {
                let v = { ...values };
            setValue(v, prefix, input.value);
                setValues(v);
        }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
            <SelectOption value="true">{t("button.true")}</SelectOption>
            <SelectOption value="false">{t("button.false")}</SelectOption>
        </Select>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values, t } = props;
        const value = getValue(values, prefix);
        return value ? t("button.true") : t("button.false");
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
