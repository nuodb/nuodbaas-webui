// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { setValue, getValue } from "./utils";
import TextField from "../controls/TextField";
import Button from "../controls/Button";
import FieldBase, { FieldBaseType, FieldProps } from "./FieldBase"
import { TempAny } from "../../utils/types";
import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../controls/Table";
import InfoPopup from "../controls/InfoPopup";

export default function FieldMap(props: FieldProps): FieldBaseType {

    function validateNewKey(): boolean {
        const { prefix, parameter, updateErrors } = props;
        let prefixKeyLabel = prefix + ".key";
        let prefixValueLabel = prefix + ".value";
        let keyElement = document.getElementById(prefixKeyLabel) as HTMLInputElement;
        let valueElement = document.getElementById(prefixValueLabel) as HTMLInputElement;
        if ((keyElement && keyElement.value !== "") || (valueElement && valueElement.value !== "")) {
            return FieldBase(props).validate(prefixKeyLabel, parameter, keyElement.value);
        }

        updateErrors(prefixKeyLabel, null);
        updateErrors(prefixValueLabel, null);
        return true;
    }

    function validateNewValue(): boolean {
        const { prefix, parameter, updateErrors } = props;
        let prefixKeyLabel = prefix + ".key";
        let prefixValueLabel = prefix + ".value";
        let keyElement = document.getElementById(prefixKeyLabel) as HTMLInputElement;
        let valueElement = document.getElementById(prefixValueLabel) as HTMLInputElement;
        if ((keyElement && keyElement.value !== "") || (valueElement && valueElement.value !== "")) {
            return FieldBase(props).validate(prefixValueLabel, parameter["additionalProperties"], valueElement.value);
        }

        updateErrors(prefixKeyLabel, null);
        updateErrors(prefixValueLabel, null);
        return true;
    }

    /**
     * show Field of type Object using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required - does this field require a value?
     * @param setValues - callback to update field value
     * @returns
     */
    function show(): ReactNode {
        const { prefix, values, errors, setValues, readonly, parameter, t } = props;

        let valueKeys = Object.keys(getValue(values, prefix) || {});
        let rows = [];
        for (let i = 0; i < valueKeys.length; i++) {
            let prefixKeyLabel = prefix + "." + i + ".key";
            let prefixKeyValue = prefix + "." + i + ".value";
            let prefixKey = prefix + "." + valueKeys[i];
            let errorValue = (errors && (prefixKeyValue in errors) && errors[prefixKeyValue]) || "";
            rows.push(<TableRow key={prefixKeyLabel}>
                <TableCell>
                    <TextField
                        disabled={true}
                        id={prefixKeyLabel}
                        label=""
                        value={valueKeys[i]} />
                </TableCell>
                <TableCell>
                    <TextField
                        id={prefixKeyValue}
                        label=""
                        value={getValue(values, prefix)[valueKeys[i]]}
                        onChange={({ currentTarget: input }) => {
                            let v = { ...values };
                            setValue(v, prefixKey, input.value);
                            setValues(v)
                        }}
                        error={errorValue}
                        onBlur={event => FieldBase(props).validate(prefixKeyValue, getValue(values, prefix)[valueKeys[i]])} />
                </TableCell>
                <TableCell><Button onClick={() => {
                    let v = { ...values };
                    setValue(v, prefixKey, null);
                    setValues(v);
                }}>{t("button.delete")}</Button></TableCell>
            </TableRow>);
        }

        let prefixKeyLabel = prefix + ".key";
        let prefixValueLabel = prefix + ".value"
        let errorKey = (errors && (prefixKeyLabel in errors) && errors[prefixKeyLabel]) || "";
        let errorValue = (errors && (prefixValueLabel in errors) && errors[prefixValueLabel]) || "";
        !readonly && rows.push(<TableRow key={prefixKeyLabel}>
            <TableCell>
                <TextField
                    id={prefixKeyLabel}
                    label={t("field.map.hint.new.key")}
                    defaultValue=""
                    onBlur={() => validateNewKey()}
                    error={errorKey} />
            </TableCell>
            <TableCell>
                <TextField
                    id={prefixValueLabel}
                    label={t("field.map.hint.new.value")}
                    defaultValue=""
                    onBlur={() => validateNewValue()}
                    error={errorValue} />
            </TableCell>
            <TableCell>
                <Button data-testid={"add_button_" + prefix} onClick={() => {
                    let keyElement = document.getElementById(prefixKeyLabel) as HTMLInputElement;
                    let valueElement = document.getElementById(prefixValueLabel) as HTMLInputElement;
                    if (keyElement.value === "" && valueElement.value === "") {
                        return;
                    }

                    if (!validateNewKey() || !validateNewValue()) {
                        return;
                    }

                    let value = getValue(values, prefix);
                    if (value === null) {
                        value = {};
                    }
                    value = { ...value };
                    value[keyElement.value] = valueElement.value;
                    keyElement.value = "";
                    valueElement.value = "";
                    setValue(values, prefix, value);
                    setValues(values);
                }}>{t("button.add")}</Button>
            </TableCell>
        </TableRow>);

        return (
            <Table key={prefix}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("field.label." + prefix, prefix)} {t("field.map.header.label.key")}</TableCell>
                        <TableCell>{t("field.label." + prefix, prefix)} {t("field.map.header.label.value")}</TableCell>
                        <TableCell className="NuoTableMenuCell"><InfoPopup description={parameter.description} /></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows}
                </TableBody>
            </Table>
        );
    }

    function validate(): boolean {
        const { prefix, parameter, values } = props;

        let value = values[prefix];
        let success = true;
        if (value && parameter["additionalProperties"]) {
            let value = getValue(values, prefix);
            if (value) {
                Object.values(value).forEach((v: TempAny, index: number) => {
                    const fieldKey = prefix + "." + index + ".value";
                    success = FieldBase(props).validate(fieldKey, parameter["additionalProperties"], v) && success;
                })
            }
        }
        success = validateNewKey() && success;
        success = validateNewValue() && success;
        return success;
    }

    function getDisplayValue(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        return <dl className="map">{Object.keys(value).map(key => {
            return <div key={key}><dt>{String(key)}</dt><dd>{getValue(values, prefix + "." + key)}</dd></div>;
        })}</dl>
    }

    return { ...FieldBase(props), show, validate, getDisplayValue }
}