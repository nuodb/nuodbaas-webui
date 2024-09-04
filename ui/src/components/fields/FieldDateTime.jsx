import React from "react";
import FieldBase from "./FieldBase";
import TextField from '@mui/material/TextField'
import { getValue, setValue } from "./utils"

export default class FieldDateTime extends FieldBase {
    /**
     * show Field of type DateTime using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param setValues - callback to update field value
     * @returns
     */
    show() {
        const { prefix, values, errors, required, setValues, autoFocus, updateErrors } = this.props;
        let value = getValue(values, prefix);
        let editValue = getValue(values, "_" + prefix);
        if (editValue === null) {
            editValue = value === null ? "" : (new Date(value)).toLocaleString();
        }
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        return <TextField
            key={prefix}
            fullWidth={true}
            required={required}
            id={prefix}
            name={prefix}
            label={prefix}
            value={editValue}
            autoFocus={autoFocus}
            error={error !== ""}
            helperText={error}
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
                    if (isNaN(date)) {
                        updateErrors(prefix, "Field \"" + prefix + "\" has invalid date/time value");
                        return;
                    }
                    setValue(v, prefix, date.toISOString().replaceAll(".000Z", "Z"));
                    setValue(v, "_" + prefix);
                }
                updateErrors(prefix, null);
                setValues(v);
            }} />
    }

    /** validates if field is in correct format
     * There are two fields in the "values" object - "<prefix>" and "_<prefix>".
     * The "<prefix>" field contains the value in the data store which will be sent to the server.
     * The "_<prefix>" field stores temporarily the entered value and will be cleared when exiting
     *    the field and the field is in the correct date/time format.
     */
    validate() {
        const { prefix, values, updateErrors } = this.props;
        let editValue = getValue(values, "_" + prefix);
        if (editValue !== null) {
            updateErrors(prefix, "Field \"" + prefix + "\" has invalid date/time format");
            return false;
        }
        return super.validate();
    }

    getDisplayValue() {
        const value = super.getDisplayValue();
        if (!value) {
            return value;
        }

        let date = new Date(value);
        if (!isNaN(date)) {
            return date.toLocaleString();
        }
        return value;
    }
}