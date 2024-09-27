// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TableMaterial from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { getResourceByPath, getCreatePath, getChild, replaceVariables, matchesPath } from "../../../utils/schema";
import FieldFactory from "../../fields/FieldFactory";
import RestSpinner from "./RestSpinner";
import { getValue } from "../../fields/utils";
import Dialog from "./Dialog";
import { CustomizationsType, TempAny } from "../../../utils/types";

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
export default function Table(props: TempAny) {
    const { schema, data, path } = props;
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

        let tableFields = [];
        if ("$ref" in dataKeys) {
            tableFields.push("$ref");
            delete dataKeys["$ref"];
        }
        if ("resourceVersion" in dataKeys) {
            delete dataKeys["resourceVersion"]
        }
        let ret = [...tableFields, ...Object.keys(dataKeys)];

        let cf = getCustomFields();
        Object.keys(cf).forEach(key => {
            if (!ret.includes(key)) {
                ret.push(key);
            }
        })
        return ret;
    }

    let customFields: TempAny = null;
    function getCustomFields() {
        const w: TempAny = window;
        let customizations: CustomizationsType = w["getCustomizations"] && w["getCustomizations"]();
        if (customFields === null && customizations && customizations.views) {
            customFields = {};
            for (const sPath of Object.keys(customizations.views)) {
                if (matchesPath(path, sPath)) {
                    customFields = customizations.views[sPath];
                    break;
                }
            }
        }
        return customFields || {};
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
    const fieldsSchema = getChild(getResourceByPath(schema, getCreatePath(schema, path)), ["get", "responses", "200", "content", "application/json", "schema", "properties"]);

    return (<TableContainer component={Paper}>
        <TableMaterial data-testid={props["data-testid"]} sx={{ minWidth: 650 }}>
            <TableHead>
                <TableRow>
                    {tableFields.map(field => <TableCell key={field}>{field === "$ref" ? "" : field}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row: TempAny, index: number) => (
                    <TableRow key={row["$ref"] || index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        {tableFields.map(field => {
                            if (field === "$ref") {
                                return <TableCell key={field}>
                                    <Button data-testid="edit_button" variant="text" onClick={() =>
                                        navigate("/ui/resource/edit" + path + "/" + row[field])
                                    }>Edit</Button>
                                    {("delete" in (getResourceByPath(schema, path + "/" + row[field]) || {})) && <Button data-testid="delete_button" variant="text" onClick={() => {
                                        RestSpinner.delete(path + "/" + row[field])
                                            .then(() => {
                                                window.location.reload();
                                            }).catch((error) => {
                                                RestSpinner.toastError("Unable to delete " + path + "/" + row[field], error);
                                            });
                                        window.location.reload();
                                    }}>Delete</Button>}</TableCell>;
                            }
                            else {
                                let cf = getCustomFields();

                                let value;
                                if (field in cf && cf[field].value && typeof cf[field].value === "function") {
                                    try {
                                        if (field in fieldsSchema) {
                                            value = FieldFactory.createDisplayValue({
                                                prefix: field,
                                                parameter: fieldsSchema[field],
                                                values: { [field]: cf[field].value(row) }
                                            });
                                        }
                                        else {
                                            value = showValue(cf[field].value(row));
                                        }
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
                                            parameter: fieldsSchema[field],
                                            values: row
                                        });
                                    }
                                    else {
                                        value = showValue(getValue(row, field));
                                    }
                                }

                                let buttons: TempAny = [];
                                if (field in cf && cf[field].buttons) {
                                    cf[field].buttons.forEach((button: TempAny) => {
                                        let buttonVisible = false;
                                        try {
                                            buttonVisible = !button.visible || (typeof button.visible === "function" && button.visible(row));
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
        </TableMaterial>
    </TableContainer>
    );
}