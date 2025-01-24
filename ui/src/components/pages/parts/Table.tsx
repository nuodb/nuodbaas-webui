// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { useNavigate } from 'react-router-dom';
import { withTranslation } from "react-i18next";
import { TableBody, TableTh, TableCell, Table as TableCustom, TableHead, TableRow } from '../../controls/Table';
import { getResourceByPath, getCreatePath, getChild, replaceVariables, getSchemaPath } from "../../../utils/schema";
import FieldFactory from "../../fields/FieldFactory";
import { Rest } from "./Rest";
import Dialog from "./Dialog";
import { MenuItemProps, PageProps, TempAny } from "../../../utils/types";
import { CustomViewField, evaluate, getCustomizationsView } from '../../../utils/Customizations';
import Menu from '../../controls/Menu';
import TableSettingsColumns from './TableSettingsColumns';
import { useEffect, useState } from 'react';
import CustomDialog from '../custom/CustomDialog';

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

interface TableProps extends PageProps {
    ["data-testid"]: string;
    data: TempAny;
    path: string;
}

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
function Table(props: TableProps) {
    const { schema, data, path, org, t } = props;
    const [columns, setColumns] = useState<MenuItemProps[]>([]);
    let navigate = useNavigate();
    let lastSchemaPathElement = "/" + getSchemaPath(schema, path);
    lastSchemaPathElement = lastSchemaPathElement.substring(lastSchemaPathElement.lastIndexOf("/") + 1);

    /**
     * Find all fields to be shown in the table
     * - checks all data rows/columns for available fields ignoring "resourceVersion"
     * @returns
     */
    useEffect(() => {
        function getLabel(field: string) {
            if (cv && cv.fields && cv.fields[field] && cv.fields[field].label !== undefined) {
                return cv.fields[field].label;
            }
            else {
                return t("field.label." + field, field);
            }
        }

        let resourcesByPath = getResourceByPath(schema, path);
        let methodSchema = resourcesByPath["get"];
        if (!methodSchema || !data) {
            return;
        }

        let cols: MenuItemProps[] = [];

        const cv = getCustomizationsView(path);
        if (cv && cv.columns) {
            cols = [...cols, ...cv.columns.map(column => { return { id: column, selected: true, label: getLabel(column) } })];
        }
        const cfs = (cv && cv.fields) || null;
        if (cfs) {
            Object.keys(cfs).forEach(field => {
                if (!cols.find(col => col.id === field)) {
                    cols.push({ id: field, selected: false, label: getLabel(field) });
                }
            })
        }

        data.forEach((row: TempAny) => {
            getFlattenedKeys(row).forEach((key: TempAny) => {
                if (!cols.find(col => col.id === key)) {
                    cols.push({ id: key, selected: !cv?.columns && !key.includes("."), label: getLabel(key) });
                }
            });
        })

        setColumns(cols);
    }, [data, path, schema, t]);

    type TableLabelsType = {
        [key: string]: string
    }

    function getTableLabels(): TableLabelsType {
        let ret: TableLabelsType = {};
        const cv = getCustomizationsView(path);
        columns.forEach(column => {
            if (cv && cv.fields && cv.fields[column.id] && cv.fields[column.id].label !== undefined) {
                ret[column.id] = cv.fields[column.id].label;
            }
            else {
                ret[column.id] = t("field.label." + column.id, column.id);
            }
        });
        return ret;
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

    async function handleDelete(row: TempAny, deletePath: string) {
        const createPathFirstPart = deletePath?.replace(/^\//, "").split("/")[0];
        row = { ...row, resources_one: t("resource.label." + createPathFirstPart + "_one", createPathFirstPart) };
        if ("yes" === await Dialog.confirm(t("confirm.delete.resource.title", row), t("confirm.delete.resource.body", row), t)) {
            Rest.delete(deletePath)
                .then(() => {
                    window.location.reload();
                }).catch((error) => {
                    Rest.toastError("Unable to delete " + deletePath, error);
                });
        }
    }

    function renderMenuCell(row: any) {
        let editDeletePath: string;
        if (lastSchemaPathElement.startsWith("{")) {
            editDeletePath = path + "/" + row["$ref"];
        }
        else {
            // special case for /backuppolicies/{organization}/{name}/databases (or similar) where the last element specifies a resource type
            editDeletePath = "/" + lastSchemaPathElement + "/" + row["$ref"];
        }
        const resource = getResourceByPath(schema, editDeletePath)
        const buttons: MenuItemProps[] = [];
        if (resource && ("put" in resource)) {
            buttons.push({
                "data-testid": "edit_button",
                id: "edit",
                label: t("button.edit"),
                onClick: () => {
                    navigate("/ui/resource/edit" + editDeletePath);
                }
            });
        }
        if (resource && ("delete" in resource)) {
            buttons.push({
                "data-testid": "delete_button",
                id: "delete",
                onClick: () => handleDelete(row, editDeletePath),
                label: t("button.delete")
            });
        }

        const cv = getCustomizationsView(path)
        if (cv && cv.menu) {
            cv.menu.forEach((menu: TempAny) => {
                let menuVisible = false;
                try {
                    menuVisible = !menu.visible || evaluate(row, menu.visible);
                }
                catch (ex) {
                    const msg = "Error in checking visibility of button.";
                    Rest.toastError(msg, String(ex));
                    console.log(msg, ex, row);
                }

                if (menuVisible) {
                    buttons.push({
                        "data-testid": menu.label,
                        id: menu.label,
                        label: t(menu.label),
                        onClick: async () => {
                            let label = t(menu.label, row);
                            if (menu.confirm) {
                                let confirm = t(menu.confirm, row);
                                if ("yes" !== await Dialog.confirm(label, confirm, t)) {
                                    return;
                                }
                            }
                            if (menu.patch) {
                                Rest.patch(path + "/" + row["$ref"], menu.patch)
                                    .catch((error) => {
                                        Rest.toastError("Unable to update " + path + "/" + row["$ref"], error);
                                    })
                            }
                            else if (menu.link) {
                                const link = replaceVariables(menu.link, row);
                                if (!link.startsWith("//") && link.indexOf("://") === -1) {
                                    navigate(link);
                                }
                            }
                            else if (menu.dialog) {
                                CustomDialog({ dialog: menu.dialog, data: row, t });
                            }
                        }
                    });
                }
            })
        }

        return <TableCell key={row["$ref"]} className="NuoTableMenuCell">
            <Menu popupId={"row_menu_" + row["$ref"]} items={buttons} align="right" />
        </TableCell>;

    }

    /* gets the schema of the specified field.
       If the field is hierarchical, it will find the schema of the right most field.
       Returns defaults if not found. */
    function getFieldSchema(fieldName: string) {
        const fieldsSchema = getChild(getResourceByPath(schema, getCreatePath(schema, path) || path), ["get", "responses", "200", "content", "application/json", "schema", "properties"]);
        let fs = fieldsSchema;
        let fn = fieldName;
        while (fs && fn.includes(".") && fn.split(".")[0] in fs) {
            fs = fs[fn.split(".")[0]].properties;
            fn = fn.substring(fn.indexOf(".") + 1);
        }
        return (fs && fs[fn]) || {};
    }

    function renderDataCell(fieldName: string, row: TempAny) {
        const cv = getCustomizationsView(path)
        const cf: CustomViewField | null = (cv && cv.fields && cv.fields[fieldName]) || null;

        let value;
        if (cf && cf.value) {
            try {
                value = showValue(evaluate(row, cf.value));
            }
            catch (ex) {
                const msg = "Error in custom value evaluation for field \"" + fieldName + "\"";
                Rest.toastError(msg, String(ex));
                console.log(msg, ex, row);
                value = ""
            }
        }
        else {
            value = FieldFactory.createDisplayValue({
                path: path,
                prefix: fieldName,
                label: t("field.label." + fieldName, fieldName),
                parameter: getFieldSchema(fieldName),
                values: row,
                t
            });
        }

        return <TableCell key={fieldName}>
            {fieldName === "name" ? <button onClick={() => {
                navigate("/ui/resource/view" + path + "/" + row["$ref"]);
            }}>{value}</button> : value}
        </TableCell>;

    }

    const tableLabels = getTableLabels();
    const visibleColumns = columns.filter(col => col.selected && (col.id !== "organization" || org === ""));
    return (
        <TableCustom data-testid={props["data-testid"]}>
            <TableHead>
                <TableRow>
                    {visibleColumns.map((column, index) => <TableTh key={column.id} data-testid={column.id}>
                        {tableLabels[column.id]}
                    </TableTh>)}
                    <TableTh key="$ref" data-testid="$ref" className="NuoTableMenuCell">
                        {data.length > 0 && <TableSettingsColumns data={data} path={path} columns={columns} setColumns={setColumns} />}
                    </TableTh>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row: TempAny, index: number) => (
                    <TableRow key={row["$ref"] || index}>
                        {visibleColumns.map(column => renderDataCell(column.id, row))}
                        {renderMenuCell(row)}
                    </TableRow>
                ))}
                {data.length === 0 && <tr><td><div data-testid="table_nodata" className="NuoTableNoData">{t("text.noData")}</div></td></tr>}
            </TableBody>
        </TableCustom>
    );
}

export default withTranslation()(Table);