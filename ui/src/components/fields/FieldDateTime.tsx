// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase";
import { getValue, setValue } from "./utils"
import { ReactNode } from "react";
import TextField from "../controls/TextField";

export default function FieldDateTime(props: FieldProps): FieldBaseType {
    /**
     * show Field of type DateTime using the values and schema definition
     * @returns
     */
    function show(): ReactNode {
        const { prefix, values, errors, required, setValues, autoFocus, updateErrors, readonly } = props;
        let value = getValue(values, prefix);
        let editValue = getValue(values, "_" + prefix);
        if (editValue === null) {
            editValue = value === null ? "" : (new Date(value)).toLocaleString();
        }
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField
            key={prefix}
            required={required}
            id={prefix}
            label={prefix}
            value={editValue}
            autoFocus={autoFocus}
            error={error}
            onChange={({ currentTarget: input }) => {
                let v = { ...values };
                setValue(v, "_" + prefix, input.value);
                setValues(v);
            }}
            onBlur={() => {
                let v = { ...values };
                if (editValue === "") {
                    setValue(v, prefix, null);
                    setValue(v, "_" + prefix, null);
                }
                else {
                    const date = new Date(editValue);
                    if (isNaN(date.getTime())) {
                        updateErrors(prefix, "Field \"" + prefix + "\" has invalid date/time value");
                        return;
                    }
                    setValue(v, prefix, date.toISOString().replaceAll(".000Z", "Z"));
                    setValue(v, "_" + prefix);
                }
                updateErrors(prefix, null);
                setValues(v);
            }}
            disabled={readonly}
        />
    }

    /** validates if field is in correct format
     * There are two fields in the "values" object - "<prefix>" and "_<prefix>".
     * The "<prefix>" field contains the value in the data store which will be sent to the server.
     * The "_<prefix>" field stores temporarily the entered value and will be cleared when exiting
     *    the field and the field is in the correct date/time format.
     */
    function validate(): boolean {
        const { prefix, values, updateErrors } = props;
        let editValue = getValue(values, "_" + prefix);
        if (editValue !== null) {
            updateErrors(prefix, "Field \"" + prefix + "\" has invalid date/time format");
            return false;
        }
        return FieldBase(props).validate();
    }

    function getDisplayValue(): ReactNode {
        const value = String(FieldBase(props).getDisplayValue());
        if (!value) {
            return value;
        }

        let date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
        return value;
    }

    return { ...FieldBase(props), show, validate, getDisplayValue };
}