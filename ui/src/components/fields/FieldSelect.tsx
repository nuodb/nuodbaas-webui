// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

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

        return <Select id={prefix} key={prefix} label={label} description={parameter.description} value={value} autoFocus={autoFocus} required={required} onChange={(e: any) => {
            let v = { ...values };
            setValue(v, prefix, e.target.value);
            setValues(v);
        }} onBlur={() => FieldBase(props).validate()} disabled={readonly}>
            <SelectOption value="">{t("field.select.selectItem")}</SelectOption>
            {parameter && parameter.enum && parameter.enum.map(e => {
                let description = undefined;
                const enumDescriptions = parameter["x-enum-descriptions"];
                if (enumDescriptions) {
                    description = enumDescriptions[e]
                }
                return <SelectOption value={e}>{t("field.enum." + prefix + "." + e, e)} {description}</SelectOption>
            })}
        </Select>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values, t } = props;
        const value = getValue(values, prefix);
        return t("field.enum." + prefix + "." + value, value);
    }

    return { ...FieldBase(props), show, getDisplayValue };
}
