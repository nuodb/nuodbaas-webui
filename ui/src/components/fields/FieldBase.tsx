// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { getValue } from "./utils";
import { FieldValuesType, FieldParameterType } from "../../utils/types";

export interface FieldPropsDisplay {
    /** contains field name (hierarchical fields are separated by period) */
    prefix: string,

    /** schema definition for this field */
    parameter: FieldParameterType,

    /** contains object with ALL values (and field names) of this form (not just this field).
     *  the key is the field name (name is separated by period if the field is hierarchical) */
    values: FieldValuesType,
}

export interface FieldPropsValidate extends FieldPropsDisplay {
    /** callback to updates errors for the specified field (prefix) and error message.
     *  the prefix is the field name (name is separated by period if the field is hierarchical)
     *  the message is the error message or null if the error message should be cleared. */
    updateErrors: (prefix: string, message: string | null) => void,

    /** callback to updates all values for all fields */
    setValues: (values: FieldValuesType) => void,

}

export interface FieldProps extends FieldPropsValidate {
    /** contains object with ALL errors(and field names) of this form(not just this field)
     *  the key is the field name (name is separated by period if the field is hierarchical)
     *  and the value is the error message. */
    errors: {
        [key: string]: string
    }

    /** indicates if the field is required. This will be checked when validating the field
     *  or form and will also add an asterisk as visual indicator to the field.
     */
    required: boolean,

    /** set default focus (cursor) to this field */
    autoFocus: boolean,

    /** expand sections? */
    expand: boolean,

    /** hide title? */
    hideTitle: boolean,

    /** is read only field? */
    readonly: boolean,

    /** used by FieldMessage to indicate an error message */
    message?: string;
}

export interface FieldBaseType {
    props: FieldProps,
    validate: (prefix?: string, parameter?: FieldParameterType, value?: string) => boolean,
    show: () => ReactNode,
    getDisplayValue: () => ReactNode,
}

/**
 * Base class for all the Field* classes. Performs general field validation and text display of the field
 */
export default function FieldBase(props: FieldProps): FieldBaseType {

    /** validate field and set error state
     * prefix - field name to validate (separated by period on hierarchical fields). Defaults to props.prefix
     * parameter - schema definition for this field. Defaults to props.parameter
     * value - value to check. if undefined, defaults to the value for "prefix"
     * @returns true if validation passed.
     */
    function validate(prefix?: string, parameter?: FieldParameterType, value?: string): boolean {
        const { values, updateErrors } = props;
        if (!prefix) {
            prefix = props.prefix;
        }
        if (!parameter) {
            parameter = props.parameter;
        }
        if (value === undefined) {
            value = getValue(values, prefix);
        }

        if (!value) {
            if (parameter.required && !value) {
                updateErrors(prefix, "Field " + prefix + " is required");
                return false;
            }
        }
        else {
            if (parameter.pattern) {
                if (!(new RegExp("^" + parameter.pattern + "$")).test(value)) {
                    updateErrors(prefix, "Field \"" + prefix + "\" must match pattern \"" + parameter.pattern + "\"");
                    return false;
                }
            }
        }
        updateErrors(prefix, null);
        return true;
    }

    /**
     * shows field. Must be implemented
     */
    function show(): ReactNode {
        throw new Error("show() must be implemented");
    };

    /**
     * shows display value of the field (read only)
     * @returns display value
     */
    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        let value = getValue(values, prefix);
        if (value === undefined || value === null) {
            return "";
        }
        value = String(value);
        if (value.indexOf("\n") !== -1) {
            value = value.substring(0, value.indexOf("\n")) + "...";
        }
        if (value.length > 80) {
            value = value.substring(0, 80) + "...";
        }
        return String(value);
    }

    return { props, validate, show, getDisplayValue }
}