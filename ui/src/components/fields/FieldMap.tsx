// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { setValue, getValue } from "./utils";
import TextField from "../controls/TextField";
import Button from "../controls/Button";
import { FieldBase_validate, FieldProps } from "./FieldBase"
import { TempAny } from "../../utils/types";
import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../controls/Table";
import InfoPopup from "../controls/InfoPopup";

export default function FieldMap(props: FieldProps): ReactNode {
    switch (props.op) {
        case "edit": return edit();
        case "view": return view();
        case "validate": return validate();
    }

    function validateNewKey(): boolean {
        const { prefix, updateErrors } = props;
        let prefixKeyLabel = prefix + ".key";
        let prefixValueLabel = prefix + ".value";
        let keyElement = document.getElementById(prefixKeyLabel) as HTMLInputElement;
        let valueElement = document.getElementById(prefixValueLabel) as HTMLInputElement;
        if ((keyElement && keyElement.value !== "") || (valueElement && valueElement.value !== "")) {
            return FieldBase_validate({
                ...props,
                prefix: prefixKeyLabel,
                values: {
                    ...props.values,
                    [prefixKeyLabel]: keyElement.value
                }
            });
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
            return FieldBase_validate({
                ...props,
                prefix: prefixValueLabel,
                parameter: parameter["additionalProperties"] || parameter,
                values: {
                    ...props.values,
                    [prefixValueLabel]: valueElement.value
                }
            });
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
    function edit(): ReactNode {
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
                        onBlur={event => FieldBase_validate({
                            ...props,
                            prefix: prefixKeyValue,
                            parameter: getValue(values, prefix)[valueKeys[i]]
                        }
                        )} />
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
                        <TableCell><InfoPopup description={parameter.description} /></TableCell>
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
                    success = FieldBase_validate({
                        ...props,
                        prefix: fieldKey,
                        parameter: parameter["additionalProperties"] || parameter,
                        values: {
                            ...values,
                            [fieldKey]: v
                        }
                    }) && success;
                })
            }
        }
        success = validateNewKey() && success;
        success = validateNewValue() && success;
        return success;
    }

    function uniqueArray(array: any[]): any[] {
        return [...new Set(array)];
    }

    function view(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);

        // If a key has a forward slash (/), we'll group the key (the group name is the text before the slash).
        // Show the non-group items first, followed by the group items.
        let ret: ReactNode[] = [
            Object.keys(value)
                .filter(key => !key.includes("/"))
                .map(key => {
                    return <div key={key} className={"NuoTableField_" + prefix.replaceAll(".", "_")}>
                        {String(key)}: {getValue(values, prefix + "." + key)}
                    </div>;
                })
        ]

        let groups = uniqueArray(
            Object.keys(value)
                .filter(key => key.includes("/"))
                .map(key => key.split("/")[0])
            );
        groups.forEach(group => {
            const groupKeys = Object.keys(value).filter(key => key.startsWith(group + "/"));
            ret.push(<div className={"NuoTableField_" + prefix.replaceAll(".", "_")} key={group}>
                <details>
                    <summary><div className="NuoSummaryContent">{group}<div className="NuoBadgeLight">{groupKeys.length}</div></div></summary>
                    {groupKeys.map(key => {
                        const label = key.substring(group.length + 1) + ": " + getValue(values, prefix + "." + key);
                        return <div className="NuoEllipsis" style={{ width: "200px" }} title={label}>
                            {label}
                        </div>;
                    })
                    }
                </details>
            </div>)
        });

        return ret;
    }
}