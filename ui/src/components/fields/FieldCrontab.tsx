// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { getValue, setValue } from "./utils"
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { ReactNode } from 'react';
import Select, { SelectOption } from "../controls/Select";
import TextField from "../controls/TextField";
import { FieldParameterType } from "../../utils/types";

export default function FieldCrontab(props: FieldProps): FieldBaseType {

    /**
     * show Field of type Boolean using the values and schema definition
     */
    function show(): ReactNode {
        const { prefix, label, values, setValues, errors, autoFocus, readonly, required, t } = props;
        let error = (errors && (prefix in errors) && errors[prefix]) || "";
        let value = getValue(values, prefix) || "";
        const parts = value.split(" ");
        let frequency = "";
        const isOther = parts.length !== 1;
        if (!isOther) {
            frequency = parts[0];
        }
        else {
            frequency = "other";
        }

        function setPart(index: number, partValue: string) {
            let v = { ...values };
            let parts = value.split(" ");
            parts[index] = partValue;
            setValue(v, prefix, parts.join(" "));
            setValues(v);
        }

        function handleBlur() {
            FieldBase(props).validate() && validate();
        }

        return <div key={prefix} className={(isOther && "NuoFieldCrontab") || ""}>
            <label id={"label_" + prefix}>{isOther && label}</label>
            <Select id={prefix} key={prefix} label={(!isOther && label) || ""} value={frequency} required={required} autoFocus={autoFocus} onChange={(e: any) => {
                let v = { ...values };
                if (e.target.value === "other") {
                    setValue(v, prefix, "* * * * *");
                }
                else {
                    setValue(v, prefix, e.target.value);
                }
                setValues(v);
            }} onBlur={handleBlur} disabled={readonly}>
                <SelectOption value="">{t("field.select.selectItem")}</SelectOption>
                <SelectOption value="@hourly">@hourly</SelectOption>
                <SelectOption value="@daily">@daily</SelectOption>
                <SelectOption value="@weekly">@weekly</SelectOption>
                <SelectOption value="@monthly">@monthly</SelectOption>
                <SelectOption value="@yearly">@yearly</SelectOption>
                <SelectOption value="other">Other</SelectOption>
            </Select>
            {isOther && <div className="NuoCrontabContainer">
                {["minute", "hour", "dayOfMonth", "month", "weekday"].map((fieldname, index) => (
                    <TextField
                        key={prefix + "-" + fieldname}
                        id={prefix + "-" + fieldname}
                        label={t("field.crontab." + fieldname)}
                        value={parts[index]}
                        required={true}
                        onChange={(e: any) => {
                            setPart(index, e.target.value.replaceAll(" ", ""));
                        }}
                        onBlur={handleBlur}
                        disabled={readonly}
                    />
                ))}
            </div>}
            <div className="NuoError">{error}</div>
        </div>;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values, t } = props;
        const value = getValue(values, prefix);
        return t("field.enum." + prefix + "." + value, prefix + "." + value);
    }

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
        if (value === undefined) {
            value = getValue(values, prefix);
        }
        if (!value) {
            if (parameter?.required) {
                updateErrors(prefix, "Field " + prefix + " is required");
                return false;
            }
            else {
                updateErrors(prefix, null);
                return true;
            }
        }

        if (["@hourly", "@daily", "@weekly", "@monthly", "@yearly"].includes(value)) {
            updateErrors(prefix, null);
            return true;
        }

        const parts = value.split(" ");
        if (parts.length !== 5 || !parts[0] || !parts[1] || !parts[2] || !parts[3] || !parts[4]) {
            updateErrors(prefix, "All fields need to be filled out");
            return false;
        }

        updateErrors(prefix, null);
        return true;
    }

    return { ...FieldBase(props), show, validate, getDisplayValue };
}