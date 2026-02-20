// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useNavigate } from 'react-router-dom';
import { withTranslation } from "react-i18next";
import { TableBody, TableTh, TableCell, Table as TableCustom, TableHead, TableRow } from '../../controls/Table';
import { getResourceByPath, getChild, getSchemaPath, hasMonitoredPath, getEntryPath } from "../../../utils/schema";
import { Rest } from "./Rest";
import Dialog from "./Dialog";
import { MenuItemProps, PageProps, SortColumnDirectionType, TempAny } from "../../../utils/types";
import { CustomViewField, evaluate, getCustomizationsView } from '../../../utils/Customizations';
import TableSettingsColumns from './TableSettingsColumns';
import { useEffect, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { getRecursiveValue } from '../../fields/FieldBase';
import Toast from '../../controls/Toast';
import ResourcePopupMenu from './ResourcePopupMenu';
import { Field } from '../../fields/Field';
import Auth from '../../../utils/auth';
import SortIcon from '../../controls/SortIcon';

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
    sort?: SortColumnDirectionType;
    setSort?: (sort: SortColumnDirectionType) => void;
}

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
function Table(props: TableProps) {
    const { schema, data, path, t } = props;
    const [columns, setColumns] = useState<MenuItemProps[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [slaByPath, setSlaByPath] = useState<{ [path: string]: string }>({});
    let navigate = useNavigate();
    const schemaPath = getSchemaPath(schema, path);
    let lastSchemaPathElement = "/" + schemaPath;
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

        const pathParts = path.split("/");
        const organization = pathParts.length >= 3 ? pathParts[2] : undefined;
        const projPath = "/projects" + (organization ? ("/" + organization) : "");
        Rest.get(projPath + "?listAccessible=true&expand=true&offset=0&limit=1000").then((projects: any) => {
            let newSlaByPath: { [path: string]: string } = {};
            projects.items.forEach((proj: any) => {
                const key = "/" + pathParts[1] + projPath.substring("/projects".length) + "/" + proj["$ref"];
                newSlaByPath[key] = proj.sla;
            })
            setSlaByPath(newSlaByPath);
        })
    }, [data, path, schema, t]);

    useEffect(() => {
        setSelected(new Set<string>());
    }, [path, schema]);

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

    async function handleDeleteMultiple() {
        const selectedRows = data.filter((d: any) => selected.has(d["$ref"]));
        const editDeletePaths = selectedRows.map((row: any) => {
            if (lastSchemaPathElement.startsWith("{")) {
                return path + "/" + row["$ref"];
            }
            else {
                // special case for /backuppolicies/{organization}/{name}/databases (or similar) where the last element specifies a resource type
                return "/" + lastSchemaPathElement + "/" + row["$ref"];
            }
        });
        const resourceLabel = t("resource.label." + editDeletePaths[0].replace(/^\//, "").split("/")[0]);
        if ("yes" === await Dialog.confirm(
            t("confirm.delete.resources.title", { resources: resourceLabel, count: selectedRows.length }),
            t("confirm.delete.resources.body", { resources: resourceLabel, names: selectedRows.map((r: any) => r.name).join(", ") }), t)) {
            let promises = await Promise.allSettled(editDeletePaths.map((dPath: any) => Rest.delete(dPath)));
            promises.forEach((result, index) => {
                if (result.status === "rejected") {
                    Toast.show("Unable to delete " + editDeletePaths[index], result.reason);
                }
            })
            setSelected(new Set());
            if (!hasMonitoredPath(path)) {
                window.location.reload();
            }
        }
    }

    function renderMenuCell(row: any, zIndex: number) {
        return <TableCell key={row["$ref"]} className="NuoTableMenuCell NuoStickyRight" zIndex={zIndex}>
            <ResourcePopupMenu row={row} schema={schema} path={path} t={t} />
        </TableCell>;
    }

    /* gets the schema of the specified field.
       If the field is hierarchical, it will find the schema of the right most field.
       Returns defaults if not found. */
    function getFieldSchema(fieldName: string) {
        const fieldsSchema = getChild(getResourceByPath(schema, getEntryPath(schema, path) || path), ["get", "responses", "200", "content", "application/json", "schema", "properties"]);
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
                value = getRecursiveValue(evaluate(row, cf.value), t);
            }
            catch (ex) {
                const msg = "Error in custom value evaluation for field \"" + fieldName + "\"";
                Toast.show(msg, String(ex));
                console.error(msg, ex, row);
                value = ""
            }
        }
        else {
            value = Field({
                op: "view",
                path: path,
                prefix: fieldName,
                label: t("field.label." + fieldName, fieldName),
                parameter: getFieldSchema(fieldName),
                values: row,
                t,
                errors: {},
                required: false,
                autoFocus: false,
                expand: false,
                hideTitle: false,
                readonly: false,
                updateErrors: () => { },
                setValues: () => { }
            });
        }

        return fieldName === "name" ? <button key={row["$ref"]} onClick={(event) => {
                event.preventDefault();
                navigate("/ui/resource/view" + path + "/" + row["$ref"]);
        }}>{value}</button> : value;

    }

    function moveNameColumnToFront(columns: MenuItemProps[]) {
        const nameColumns = columns.filter(col => col.id === "name");
        if (nameColumns.length > 0) {
            return [nameColumns[0], ...columns.filter(col => col.id !== "name")];
        }
        else {
            return columns;
        }
    }


    function renderColumn(column: MenuItemProps | undefined) {
        if (!column || data.length === 0) {
            return undefined;
        }
        return (
            <div className="NuoRow" style={{ alignItems: "center" }}>
                <div>{data.length > 0 && tableLabels[column.id]}</div>
                {props.sort !== undefined
                    && <SortIcon
                        sort={props.sort.column !== column.id ? "none" : props.sort.direction || "none"}
                        setSort={(direction: "asc" | "desc") => {
                            props.setSort && props.setSort({ column: column.id, direction })
                        }}
                    />
                }
            </div>
        );
    }

    function renderTableSelectedActions() {
        const firstHeader = visibleColumns.length > 0 ? visibleColumns[0] : undefined;
        const deletableRefs = data.filter((d: any) => canDelete(d)).map((d: any) => d["$ref"]);
        return <TableTh data-testid={firstHeader?.id} className="NuoStickyLeft" key="__all_selected__" colSpan={selected.size === 0 ? 1 : (visibleColumns.length + 2)}>
            <div className="NuoTableSelectedActions">
                {data.length > 0 && <input className="NuoTableCheckbox"
                    type="checkbox"
                    data-testid="check_all"
                    checked={selected.size !== 0 && selected.size === deletableRefs.length}
                    onChange={() => {
                        let allSelected = selected.size === data.filter((d: any) => canDelete(d)).length;
                        if (allSelected) {
                            setSelected(new Set());
                        }
                        else {
                            setSelected(new Set(deletableRefs));
                        }
                    }}
                    disabled={deletableRefs.length === 0}
                />}
                {selected.size > 0 ? <>
                    <label>{selected.size} selected</label>
                    <button className="deleteButton" data-testid="list_resources_multiple_delete_button" onClick={(event) => {
                        event?.preventDefault();
                        handleDeleteMultiple();
                    }}><DeleteIcon />Delete</button>
                </> : renderColumn(firstHeader)
                }
            </div>
        </TableTh>
    }

    function canDelete(row: any): boolean {
        const deletePath = path + "/" + row["$ref"];
        const deletePathParent = deletePath.substring(0, deletePath.lastIndexOf("/"));
        const resource = getResourceByPath(schema, deletePath);
        if (resource && ("delete" in resource) && Auth.hasAccess("DELETE", deletePath, slaByPath[deletePathParent])) {
            return true;
        }
        else {
            return false;
        }
    }

    const tableLabels = getTableLabels();
    let visibleColumns = moveNameColumnToFront(columns.filter(col => col.selected && !schemaPath?.includes("{" + col.id + "}")));
    return (
        <TableCustom data-testid={props["data-testid"]}>
            <TableHead>
                {data.length > 0 && <TableRow>
                    {renderTableSelectedActions()}
                    {selected.size === 0 &&
                        <>
                            {visibleColumns.filter((_, index) => index > 0).map((column) => (
                                <TableTh key={column.id} data-testid={column.id}>
                                    {renderColumn(column)}
                                </TableTh>
                            ))}
                        <TableTh key="$ref" data-testid="$ref" className="NuoTableMenuCell NuoStickyRight" zIndex={1000 + data.length}>
                            {data.length > 0 && <TableSettingsColumns data={data} path={path} columns={columns} setColumns={setColumns} />}
                        </TableTh>
                        </>
                    }
                </TableRow>}
            </TableHead>
            <TableBody>
                {data.map((row: TempAny, index: number) => (
                    <TableRow key={row["$ref"] || index}>
                        <TableCell key="__selected__" className="NuoStickyLeft">
                            <div className="NuoTableCheckbox">
                                <input
                                    type="checkbox"
                                    data-testid={"check_" + index}
                                    checked={selected.has(row["$ref"])}
                                    disabled={!canDelete(row)}
                                    onChange={(event) => {
                                        let tmpSelected = new Set(selected);
                                        if (tmpSelected.has(row["$ref"])) {
                                            tmpSelected.delete(row["$ref"]);
                                        }
                                        else {
                                            tmpSelected.add(row["$ref"]);
                                        }
                                        setSelected(tmpSelected);
                                    }}
                                />
                                {visibleColumns.filter((_, index) => index === 0).map(column => renderDataCell(column.id, row))}
                            </div>
                        </TableCell>
                        {visibleColumns.filter((_, index) => index > 0).map(column => <TableCell key={column.id}>{renderDataCell(column.id, row)}</TableCell>)}
                        {renderMenuCell(row, 1000 + data.length - 1 - index)}
                    </TableRow>
                ))}
                {data.length === 0 && <tr><td><div data-testid="table_nodata" className="NuoTableNoData">{t("text.noData")}</div></td></tr>}
            </TableBody>
        </TableCustom>
    );
}

export default withTranslation()(Table);