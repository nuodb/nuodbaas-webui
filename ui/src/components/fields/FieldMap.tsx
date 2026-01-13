// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { setValue, getValue } from "./utils";
import TextField from "../controls/TextField";
import Button from "../controls/Button";
import { FieldBase_validate, FieldProps, getRecursiveValue } from "./FieldBase"
import { TempAny } from "../../utils/types";
import { ReactNode, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../controls/Table";
import InfoPopup from "../controls/InfoPopup";

interface FieldMapProps extends FieldProps {
    fixedKeys?: boolean;
}

export default function FieldMap(props: FieldMapProps): ReactNode {
    const [newKey, setNewKey] = useState("");

    switch (props.op) {
        case "edit": return edit();
        case "view": return view();
        case "validate": return validate();
    }

    function validateNewKey(): boolean {
        const { prefix, updateErrors } = props;
        let values = JSON.parse(JSON.stringify(props.values));
        let valueKeys = Object.keys(getValue(props.values, prefix) || {});
        let prefixKeyLabel = prefix + "." + valueKeys.length + ".key";
        let prefixValueLabel = prefix + "." + valueKeys.length + ".value";
        setValue(values, prefixKeyLabel, newKey);
        let keyElement = document.getElementById(prefixKeyLabel) as HTMLInputElement;
        let valueElement = document.getElementById(prefixValueLabel) as HTMLInputElement;
        if ((keyElement && keyElement.value !== "") || (valueElement && valueElement.value !== "")) {
            return FieldBase_validate({
                ...props,
                prefix: prefixKeyLabel,
                values
            });
        }

        updateErrors(prefixKeyLabel, null);
        updateErrors(prefixValueLabel, null);
        return true;
    }

    function addKey(newKey: string) {
        if (!newKey) {
            return;
        }
        if (!validateNewKey()) {
            return;
        }

        let values = JSON.parse(JSON.stringify(props.values));
        let value = getValue(values, props.prefix);
        if (value === null) {
            value = {};
        }
        value[newKey] = "";
        setValue(values, props.prefix, value);
        props.setValues(values);
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
        for (let i = 0; i <= valueKeys.length; i++) {
            if ((props.fixedKeys || props.readonly) && i === valueKeys.length) {
                break;
            }
            let prefixKeyLabel = prefix + "." + i + ".key";
            let prefixKeyValue = prefix + "." + valueKeys[i];
            let prefixKey = prefix + "." + valueKeys[i];
            let errorValue = (errors && (prefixKeyValue in errors) && errors[prefixKeyValue]) || "";
            let errorKey = (errors && (prefixKeyLabel in errors) && errors[prefixKeyLabel]) || "";
            rows.push(<TableRow key={prefixKeyLabel}>
                <TableCell>
                    <TextField
                        disabled={i < valueKeys.length || props.readonly}
                        id={prefixKeyLabel}
                        label=""
                        value={i === valueKeys.length ? newKey : valueKeys[i]}
                        onChange={({ currentTarget }) => {
                            setNewKey(currentTarget.value);
                        }}
                        onBlur={({ currentTarget }) => {
                            addKey(currentTarget.value);
                            setNewKey("");
                        }}
                        error={errorKey}
                    />
                </TableCell>
                <TableCell>
                    <TextField
                        id={prefixKeyValue}
                        disabled={props.readonly}
                        label=""
                        value={i === valueKeys.length ? "" : getValue(values, prefix)[valueKeys[i]]}
                        onChange={({ currentTarget: input }) => {
                            if (i === valueKeys.length) {
                                return;
                            }
                            let v = JSON.parse(JSON.stringify(values));
                            setValue(v, prefixKey, input.value);
                            setValues(v);
                        }}
                        error={errorValue}
                        onBlur={() => {
                            return FieldBase_validate({
                                ...props,
                                prefix: prefix + "." + valueKeys[i],
                                parameter: props.parameter["additionalProperties"] || props.parameter,
                            });
                        }} />
                </TableCell>
                <TableCell>
                    {i < valueKeys.length && !props.readonly && !props.fixedKeys &&
                        <Button onClick={() => {
                            let v = { ...values };
                            setValue(v, prefixKey, null);
                            setValues(v);
                        }}>
                            {t("button.delete")}
                        </Button>
                    }
                </TableCell>
            </TableRow>);
        }

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
        return success;
    }

    function uniqueArray(array: any[]): any[] {
        return [...new Set(array)];
    }

    function view(): ReactNode {
        const { prefix, values } = props;
        const value = getValue(values, prefix);
        if (value === undefined || value === null) {
            return null;
        }

        // If a key has a forward slash (/), we'll group the key (the group name is the text before the slash).
        // Show the non-group items first, followed by the group items.
        let ret: ReactNode[] = [
            Object.keys(value)
                .filter(key => !key.includes("/"))
                .map(key => {
                    return <div key={key} className={"NuoTableField_" + prefix.replaceAll(".", "_")}>
                        {String(key)}: {getRecursiveValue(getValue(values, prefix + "." + key), props.t)}
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