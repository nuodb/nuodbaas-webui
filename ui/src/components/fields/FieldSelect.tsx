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
        const { prefix, label, values, parameter, required, setValues, autoFocus, readonly, t } = props;
        let value = getValue(values, prefix);

        return <Select id={prefix} key={prefix} label={label} value={value} autoFocus={autoFocus} required={required} onChange={(e: any) => {
            let v = { ...values };
            setValue(v, prefix, e.target.value);
            setValues(v);
        }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
            <SelectOption value="">{t("field.select.selectItem")}</SelectOption>
            {parameter && parameter.enum && parameter.enum.map(e => <SelectOption key={e} value={e}>{t("field.enum." + prefix + "." + e, prefix + "." + e)}</SelectOption>)}
        </Select>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values, t } = props;
        const value = getValue(values, prefix);
        return t("field.enum." + prefix + "." + value, prefix + "." + value);
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
