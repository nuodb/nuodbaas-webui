// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { TableColumnType, TempAny } from "../../../utils/types";
import { mergeCustomizations } from "../../../utils/Customizations";
import Menu from "../../controls/Menu";

function saveColumns(cols: TableColumnType[], path: string) {
    mergeCustomizations({
        views: {
            "/users?/{organization}": {
                columns: cols.map(col => col.id).filter(col => col != "$ref")
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
    const { data, path, columns, setColumns, t } = props;

    /**
     * Find all fields to be shown in the table
     * - checks all data rows/columns for available fields ignoring "resourceVersion"
     * @returns
     */

    const items = columns.filter((column: TableColumnType) => column.id !== "$ref").map((column: { id: string, selected: boolean }, index: number) => {
        return {
            id: column.id,
            label: <div key={column.id} style={{ display: "flex", flexDirection: "row" }
            }>
                <input type="checkbox" id={column.id} checked={column.selected} onChange={() => {
                    let cols = [...columns];
                    cols.push()
                    cols[index].selected = !cols[index].selected;
                    saveColumns(cols, path);
                    setColumns(cols);
                }} />
                <label htmlFor={column.id}>{t("field.label." + column.id, column.id)}</label>
            </div >
        }
    });
    return <Menu popup={true} draggable={true} items={items} setItems={setColumns} align="right" />;
}

export default withTranslation()(TableSettingsColumns);