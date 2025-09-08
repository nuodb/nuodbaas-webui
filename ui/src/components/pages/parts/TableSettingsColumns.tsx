// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { MenuItemProps, TempAny } from "../../../utils/types";
import { mergeCustomizations } from "../../../utils/Customizations";
import Menu from "../../controls/Menu";
import { getSchema, getSchemaPath } from "../../../utils/schema";

async function saveColumns(cols: MenuItemProps[], path: string) {

    // find appropriate schema path - the longest path with these conditions:
    // - is a view path (doesn't have a "delete" method (or no "put" / "patch"))
    // - schema path ends with a "{variable}" component (ignoring first path component)
    // It makes all the variable components optional (prepends with "?")
    const schema = await getSchema();
    let p = path;
    let schemaPath;
    let sp;
    while ((sp = getSchemaPath(schema, p)) && (sp.endsWith("}") || sp.split("/").length === 2) && (!("delete" in schema[sp]))) {
        schemaPath = sp;
        p = p + "/next";
    }
    if (!schemaPath) {
        schemaPath = path;
    }
    schemaPath = schemaPath.replaceAll("/{", "?/{");

    // merge columns into the customizations
    mergeCustomizations({
        views: {
            [schemaPath]: {
                columns: cols.filter(col => col.id !== "$ref" && col.selected).map(col => col.id)
            }
        }
    });
}

/**
 * shows a table with all the "data". Columns are determined by the schema definition for the "path"
 * @param {*} param0
 * @returns
 */
function TableSettingsColumns(props: TempAny) {
    const { path, columns, setColumns, t } = props;

    function handleSelection(index: number) {
        let cols = [...columns];
        cols[index].selected = !cols[index].selected;
        saveColumns(cols, path);
        setColumns(cols);
    }

    /**
     * Find all fields to be shown in the table
     * - checks all data rows/columns for available fields ignoring "resourceVersion"
     * @returns
     */

    const items = columns.filter((column: MenuItemProps) => column.id !== "$ref").map((column: MenuItemProps, index: number) => {
        return {
            id: column.id,
            selected: column.selected,
            onClick: () => {
                handleSelection(index);
                return false;
            },
            onKeyDown: (event: KeyboardEvent) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelection(index);
                }
            },
            label: <div
                key={column.id}
                className="NuoTableSettingsItem"
                onClick={() => {
                    handleSelection(index);
                    return false;
                }}
            >
                <input tabIndex={-1} type="checkbox" id={column.id} checked={column.selected} readOnly={true} disabled={column.id === "name"} />
                <label htmlFor={column.id}>{t("field.label." + column.id, column.id)}</label>
            </div >
        }
    });
    return <Menu popupId={"tableColumnsMenu"} draggable={true} items={items} setItems={(items) => {
        saveColumns(items, path);
        setColumns(items);
    }} align="right" />;
}

export default withTranslation()(TableSettingsColumns);