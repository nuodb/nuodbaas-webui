// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { useNavigate } from 'react-router-dom';
import { withTranslation } from "react-i18next";
import Button from '../../controls/Button';
import { TableBody, TableCell, Table as TableCustom, TableHead, TableRow } from '../../controls/Table';
import { getResourceByPath, getCreatePath, getChild, replaceVariables } from "../../../utils/schema";
import FieldFactory from "../../fields/FieldFactory";
import RestSpinner from "./RestSpinner";
import { getValue } from "../../fields/utils";
import Dialog from "./Dialog";
import { TempAny } from "../../../utils/types";
import { CustomViewField, evaluate, getCustomizationsView } from '../../../utils/Customizations';

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
function Table(props: TempAny) {
    const { schema, data, path, t } = props;
    let navigate = useNavigate();

    /**
     * Find all fields to be shown in the table
     * - checks all data rows/columns for available fields ignoring "resourceVersion"
     * @returns
     */
    function getTableFields() {
        let resourcesByPath = getResourceByPath(schema, path);
        let methodSchema = resourcesByPath["get"];
        if (!methodSchema || !data) {
            return [];
        }
        let dataKeys: TempAny = {};
        data.forEach((row: TempAny) => {
            Object.keys(row).forEach((key: TempAny) => {
                dataKeys[key] = "";
            });
        })

        let tableFields: string[] = [];
        if ("$ref" in dataKeys) {
            tableFields.push("$ref");
            delete dataKeys["$ref"];
        }
        if ("resourceVersion" in dataKeys) {
            delete dataKeys["resourceVersion"]
        }
        const cv = getCustomizationsView(path);
        if (cv && cv.columns) {
            cv.columns.forEach(column => {
                if (column === "*") {
                    tableFields = [...tableFields, ...Object.keys(dataKeys)];
                }
                else {
                    tableFields.push(column);
                    delete dataKeys[column];
                }
            })
        }
        else {
            tableFields = [...tableFields, ...Object.keys(dataKeys)];
            dataKeys = {};
        }
        const cfs = (cv && cv.fields) || null;
        if (cfs) {
            Object.keys(cfs).forEach(key => {
                if (!tableFields.includes(key) && (!cv || !cv.columns || (!cv.columns.includes(key) && cv.columns.includes("*")))) {
                    tableFields.push(key);
                }
            })
        }
        return tableFields;
    }

    function getTableLabels() {
        const tableFields = getTableFields();
        const cv = getCustomizationsView(path);
        return tableFields.map(key => {
            if (cv && cv.fields && cv.fields[key] && cv.fields[key].label !== undefined) {
                return cv.fields[key].label;
            }
            else if (key === "$ref") {
                return "";
            }
            else {
                return t("field.label." + key, key);
            }
        });
    }

    function showValue(value: TempAny) {
        if (value === undefined || value === null) {
            return "";
        }
        else if (typeof value === "object") {
            if (Array.isArray(value)) {
                return value.map((v, index) => <div key={index}>{showValue(v)}</div>);
            }
            else {
                return <dl className="map">{Object.keys(value).map(key => <div key={key}><dt>{String(key)}</dt><dd>{showValue(value[key])}</dd></div>)}</dl>
            }
        }
        else if (typeof value === "string") {
            if (value.indexOf("\n") !== -1) {
                value = value.substring(0, value.indexOf("\n")) + "...";
            }
            if (value.length > 80) {
                value = value.substring(0, 80) + "...";
            }
            return String(value);
        }
        else {
            return String(value);
        }
    }

    const tableFields = getTableFields();
    const tableLabels = getTableLabels();
    const fieldsSchema = getChild(getResourceByPath(schema, getCreatePath(schema, path)), ["get", "responses", "200", "content", "application/json", "schema", "properties"]);

    return (<TableCustom data-testid={props["data-testid"]}>
            <TableHead>
                <TableRow>
                {tableFields.map((field, index) => <TableCell key={field} data-testid={field}>{tableLabels[index]}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row: TempAny, index: number) => (
                    <TableRow key={row["$ref"] || index}>
                        {tableFields.map(field => {
                            if (field === "$ref") {
                                const resource = getResourceByPath(schema, path + "/" + row[field])
                                return <TableCell key={field}>
                                    <Button data-testid="edit_button" variant="text" onClick={() =>
                                        navigate("/ui/resource/edit" + path + "/" + row[field])
                                    }>{t("button.edit")}</Button>
                                    {(resource && ("delete" in resource)) && <Button data-testid="delete_button" variant="text" onClick={async () => {
                                        if ("yes" === await Dialog.confirm("Deleting user " + row[field], "Do you really want to delete user " + row[field] + "?")) {
                                            RestSpinner.delete(path + "/" + row[field])
                                                .then(() => {
                                                    window.location.reload();
                                                }).catch((error) => {
                                                    RestSpinner.toastError("Unable to delete " + path + "/" + row[field], error);
                                                });
                                            window.location.reload();
                                        }
                                    }}>{t("button.delete")}</Button>}</TableCell>;
                            }
                            else {
                                const cv = getCustomizationsView(path)
                                const cf: CustomViewField | null = (cv && cv.fields && cv.fields[field]) || null;

                                let value;
                                if (cf && cf.value) {
                                    try {
                                        value = showValue(evaluate(row, cf.value));
                                    }
                                    catch (ex) {
                                        const msg = "Error in custom value evaluation for field \"" + field + "\" in row " + String(index + 1);
                                        RestSpinner.toastError(msg, String(ex));
                                        console.log(msg, ex, row);
                                        value = ""
                                    }
                                }
                                else {
                                    if (fieldsSchema && field in fieldsSchema) {
                                        value = FieldFactory.createDisplayValue({
                                            prefix: field,
                                            label: t("field.label." + field, field),
                                            parameter: fieldsSchema[field],
                                            values: row,
                                            t
                                        });
                                    }
                                    else {
                                        value = showValue(getValue(row, field));
                                    }
                                }

                                let buttons: TempAny = [];
                                if (cf && cf.buttons) {
                                    cf.buttons.forEach((button: TempAny) => {
                                        let buttonVisible = false;
                                        try {
                                            buttonVisible = !button.visible || evaluate(row, button.visible);
                                        }
                                        catch (ex) {
                                            const msg = "Error in checking visibility of button. Field: " + field + " in row " + String(index + 1);
                                            RestSpinner.toastError(msg, String(ex));
                                            console.log(msg, ex, row);
                                        }

                                        if (buttonVisible) {
                                            buttons.push(<Button key={button.label} variant="outlined" onClick={async () => {
                                                let label = replaceVariables(button.label, row);
                                                if (button.confirm) {
                                                    let confirm = replaceVariables(button.confirm, row);
                                                    if ("yes" !== await Dialog.confirm(label, confirm)) {
                                                        return;
                                                    }
                                                }
                                                if (button.patch) {
                                                    RestSpinner.patch(path + "/" + row["$ref"], button.patch)
                                                        .catch((error) => {
                                                            RestSpinner.toastError("Unable to update " + path + "/" + row["$ref"], error);
                                                        })
                                                }
                                                else if (button.link) {
                                                    const link = replaceVariables(button.link, row);
                                                    if (!link.startsWith("//") && link.indexOf("://") === -1) {
                                                        navigate(link);
                                                    }
                                                }
                                            }}>{button.label}</Button>)
                                        }
                                    })
                                }

                                return <TableCell key={field}>{value}{buttons}</TableCell>;
                            }
                        })}
                    </TableRow>
                ))}
            </TableBody>
    </TableCustom>
    );
}

export default withTranslation()(Table);