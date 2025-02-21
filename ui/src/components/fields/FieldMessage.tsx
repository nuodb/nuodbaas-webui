// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"

export default function FieldMessage(props: FieldProps): FieldBaseType {

    /**
     * show message (as a Field type)
     * @returns
     */
    function show(): ReactNode {
        const { prefix, parameter } = props;
        console.error("ERROR: Invalid object", prefix, parameter);
        if (process && process.env && process.env.NODE_ENV === "development") {
            return <h1 key={props.prefix}>{props.message}</h1>;
        }
        else {
            return null;
        }
    }

    return { ...FieldBase(props), show };
}