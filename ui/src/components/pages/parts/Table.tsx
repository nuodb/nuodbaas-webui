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
import { TableColumnType, TempAny } from "../../../utils/types";
import { CustomViewField, evaluate, getCustomizationsView } from '../../../utils/Customizations';
import Menu from '../../controls/Menu';
import TableSettingsColumns from './TableSettingsColumns';
import { useEffect, useState } from 'react';

function getFlattenedKeys(obj: TempAny, prefix?: string): string[] {
    let ret: string[] = [];
    Object.keys(obj).forEach((key: string) => {
        if (key !== "$ref" && key !== "resourceVersion") {
            const newPrefix = prefix ? prefix + "." + key : key;
            if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
                ret.push(newPrefix);
                ret = [...ret, ...getFlattenedKeys(obj[key], newPrefix)];
            }
            else {
                ret.push(newPrefix);
            }
        }
    })
    return ret;
}

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
function Table(props: TempAny) {
    const { schema, data, path, t } = props;
    const [columns, setColumns] = useState<TableColumnType[]>([]);
    let navigate = useNavigate();

    /**
     * Find all fields to be shown in the table
     * - checks all data rows/columns for available fields ignoring "resourceVersion"
     * @returns
     */
    useEffect(() => {
        let resourcesByPath = getResourceByPath(schema, path);
        let methodSchema = resourcesByPath["get"];
        if (!methodSchema || !data) {
            return;
        }

        let cols: TableColumnType[] = [];

        const cv = getCustomizationsView(path);
        if (cv && cv.columns) {
            cols = [...cols, ...cv.columns.map(column => { return { id: column, selected: true } })];
        }
        const cfs = (cv && cv.fields) || null;
        if (cfs) {
            Object.keys(cfs).forEach(field => {
                if (!cols.find(col => col.id === field)) {
                    cols.push({ id: field, selected: false });
                }
            })
        }

        data.forEach((row: TempAny) => {
            getFlattenedKeys(row).forEach((key: TempAny) => {
                if (!cols.find(col => col.id === key)) {
                    cols.push({ id: key, selected: false });
                }
            });
        })

        cols.push({ id: "$ref", selected: true });

        setColumns(cols);
    }, [data, path, schema]);

    function getTableLabels() {
        const cv = getCustomizationsView(path);
        return columns.map(column => {
            if (cv && cv.fields && cv.fields[column.id] && cv.fields[column.id].label !== undefined) {
                return cv.fields[column.id].label;
            }
            else if (column.id === "$ref") {
                return "";
            }
            else {
                return t("field.label." + column.id, column.id);
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

    async function handleDelete(ref: string) {
        if ("yes" === await Dialog.confirm("Deleting user " + ref, "Do you really want to delete user " + ref + "?")) {
            RestSpinner.delete(path + "/" + ref)
                .then(() => {
                    window.location.reload();
                }).catch((error) => {
                    RestSpinner.toastError("Unable to delete " + path + "/" + ref, error);
                });
            window.location.reload();
        }
    }

    const tableLabels = getTableLabels();
    const fieldsSchema = getChild(getResourceByPath(schema, getCreatePath(schema, path)), ["get", "responses", "200", "content", "application/json", "schema", "properties"]);
    const visibleColumns = columns.filter(col => col.selected);
    return (<TableCustom data-testid={props["data-testid"]}>
            <TableHead>
                <TableRow>
                {visibleColumns.map((column, index) => <TableCell key={column.id} data-testid={column.id}>{
                    column.id === "$ref"
                        ? <TableSettingsColumns data={data} path={path} columns={columns} setColumns={setColumns} />
                        : tableLabels[index]}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row: TempAny, index: number) => (
                    <TableRow key={row["$ref"] || index}>
                        {visibleColumns.map(column => {
                            if (column.id === "$ref") {
                                const buttons = [
                                    {
                                        "data-testid": "edit_button",
                                        id: "edit",
                                        label: t("button.edit"),
                                        onClick: () => {
                                            navigate("/ui/resource/edit" + path + "/" + row["$ref"])
                                        }
                                    }
                                ];
                                const resource = getResourceByPath(schema, path + "/" + row["$ref"])
                                if (resource && ("delete" in resource)) {
                                    buttons.push({
                                        "data-testid": "delete_button",
                                        "id": "delete",
                                        onClick: () => handleDelete(row["$ref"]),
                                        label: t("button.delete")
                                    });
                                }
                                return <TableCell key={column.id}>
                                    <Menu popup={true} items={buttons} align="right" />
                                </TableCell>;
                            }
                            else {
                                const cv = getCustomizationsView(path)
                                const cf: CustomViewField | null = (cv && cv.fields && cv.fields[column.id]) || null;

                                let value;
                                if (cf && cf.value) {
                                    try {
                                        value = showValue(evaluate(row, cf.value));
                                    }
                                    catch (ex) {
                                        const msg = "Error in custom value evaluation for field \"" + column.id + "\" in row " + String(index + 1);
                                        RestSpinner.toastError(msg, String(ex));
                                        console.log(msg, ex, row);
                                        value = ""
                                    }
                                }
                                else {
                                    if (fieldsSchema && column.id in fieldsSchema) {
                                        value = FieldFactory.createDisplayValue({
                                            prefix: column.id,
                                            label: t("field.label." + column.id, column.id),
                                            parameter: fieldsSchema[column.id],
                                            values: row,
                                            t
                                        });
                                    }
                                    else {
                                        value = showValue(getValue(row, column.id));
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
                                            const msg = "Error in checking visibility of button. Field: " + column.id + " in row " + String(index + 1);
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

                                return <TableCell key={column.id}>{value}{buttons}</TableCell>;
                            }
                        })}
                    </TableRow>
                ))}
            </TableBody>
    </TableCustom>
    );
}

export default withTranslation()(Table);