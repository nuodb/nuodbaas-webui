// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { getValue } from "./utils"
import { FieldBase_display, FieldBase_validate, FieldProps } from "./FieldBase"
import { ReactNode } from "react";

export default function FieldHidden(props: FieldProps): ReactNode {
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
        const { prefix, values } = props;
        let value = getValue(values, prefix);
        if (value === null) {
            return null;
        }
        return <input key={prefix} type="hidden" id={prefix} name={prefix} value={String(value)} />
    }
}