// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from "react";

export default function FieldHidden(props: FieldProps): FieldBaseType {
    /**
     * show Field of type String using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, values } = props;
        let value = getValue(values, prefix);
        if (value === null) {
            return null;
        }
        return <input key={prefix} type="hidden" id={prefix} name={prefix} value={String(value)} />
    }

    return { ...FieldBase(props), show };
}