// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import TextField from "../controls/TextField";
import { getValue, setValue } from "./utils"
import { FieldBase_display, FieldBase_validate, FieldProps } from "./FieldBase"
import React, { ReactNode, useState } from 'react';
import { matchesPath } from "../../utils/schema";

export default function FieldPassword(props: FieldProps): ReactNode {
    const { path, prefix, label, values, required, setValues, autoFocus, readonly, parameter, errors } = props;

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
        if (matchesPath(path, "/databases/{organization}/{project}/{database}") && !window.location.pathname.startsWith("/ui/resource/create/")) {
            return null;
        }

        let value = String(getValue(values, prefix) || "");
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField key={prefix} type="password" required={required} id={prefix} label={label} description={parameter.description} value={value} autoFocus={autoFocus} onChange={({ currentTarget: input }) => {
            let v = { ...values };
            setValue(v, prefix, input.value);
            setValues(v);
        }} error={error} onBlur={() => FieldBase_validate(props)} disabled={readonly} />
    }

}