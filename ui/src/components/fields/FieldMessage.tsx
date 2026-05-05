// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { FieldBase_display, FieldBase_validate, FieldProps } from "./FieldBase"

export default function FieldMessage(props: FieldProps): ReactNode {
    switch (props.op) {
        case "edit": return edit();
        case "view": return FieldBase_display(props);
        case "validate": return FieldBase_validate(props);
    }

    /**
     * show message (as a Field type)
     * @returns
     */
    function edit(): ReactNode {
        const { prefix, parameter } = props;
        console.error("ERROR: Invalid object", prefix, parameter);
        if (import.meta.env.PROD === false) {
            return <h1 key={props.prefix}>{props.message}</h1>;
        }
        else {
            return null;
        }
    }
}