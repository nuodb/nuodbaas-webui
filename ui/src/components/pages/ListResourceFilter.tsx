// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { ChangeEvent, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../controls/Table';
import { withTranslation } from 'react-i18next';
import Select, { SelectOption } from '../controls/Select';
import TextField from '../controls/TextField';
import Button from '../controls/Button';
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { t } from 'i18next';
import Checkboxes from '../controls/Checkboxes';
import { Feature } from '../../utils/schema';

const filterOptions = ["search", "contains", "startsWith", "endsWith", "exists", "notExists", "=", "!=", ">=", "<=", "~", "raw"] as const;
export type FilterCondition = typeof filterOptions[number];

export type SearchType = {
    field: string;              //field name. "[]" postfix indicates an array field, ".*" postfix indicates a map
    condition: FilterCondition; // comparator
    key: string;                // used for a "map" field to search keys
    value: string;              // value to search for. Unused for "exists" and "notExists" conditions
    ignoreCase: boolean;        // ignore case
    label?: string;             // stores the label shown in the list of the react-select control
};

export function isSameSearch(s1: SearchType, s2: SearchType): boolean {
    if (s1.field !== s2.field) return false;
    if (s1.condition !== s2.condition) return false;
    if (s1.value !== s2.value) return false;
    if (s1.ignoreCase !== s2.ignoreCase) return false;
    if (s1.label !== s2.label) return false;
    return true;
}

function escapeRegex(value: string) {
    // Matches all special regex characters and prepends them with a backslash
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getFieldFilter(search: SearchType) {
    let fieldName = search.field.replaceAll(/\[\]|(\.\*)$/g, "");
    if (search.field.endsWith(".*")) {
        fieldName += "." + search.key;
    }
    const fieldRegex = "{" + fieldName + "}";
    const namePrefix = fieldRegex + "~" + (search.ignoreCase ? "(?i)" : "");
    switch (search.condition) {
        case "search":
            if (search.ignoreCase) {
                return "{$.*}~(?i).*" + escapeRegex(search.value) + ".*";
            }
            else {
                return "{$.*}~.*" + escapeRegex(search.value) + ".*";
            }
        case "contains":
            return namePrefix + ".*" + escapeRegex(search.value) + ".*";
        case "startsWith":
            return namePrefix + escapeRegex(search.value) + ".*";
        case "endsWith":
            return namePrefix + ".*" + escapeRegex(search.value);
        case "exists":
            return fieldName;
        case "notExists":
            return "!" + fieldName;
        case "=":
            return namePrefix + escapeRegex(search.value);
        case "!=":
        case ">=":
        case "<=":
            if (search.ignoreCase) {
                return fieldRegex + search.condition + "(?!(?i)" + escapeRegex(search.value) + "$)";
            }
            else {
                return fieldRegex + search.condition + escapeRegex(search.value);
            }
        case "~":
            return namePrefix + search.value;
        case "raw":
            return search.value;
    }
}

export function getFieldFilterLabel(search: SearchType) {
    switch (search.condition) {
        case "search":
            return "search(" + search.value + ")";
        case "contains":
            return search.field.replaceAll(/\.\*$/g, search.key ? ("." + search.key) : "") + "=*" + search.value + "*";
        case "startsWith":
            return search.field + "=" + search.value + "*";
        case "endsWith":
            return search.field + "=*" + search.value;
        case "exists":
            return "exists(" + search.field + ")";
        case "notExists":
            return "notExists(" + search.field + ")";
        case "=":
        case "!=":
        case ">=":
        case "<=":
        case "~":
            return search.field + search.condition + search.value;
        case "raw":
            return "fieldFilter(" + search.value + ")";
    }
}

type ListResourceFilterProps = {
    editIndexOrNewField: string | number | null;
    fields: { [fieldName: string]: string };
    search: SearchType[];
    setSearch: (filter: SearchType[] | null) => void;
};

function ListResourceFilter({ editIndexOrNewField, fields, search, setSearch }: ListResourceFilterProps) {
    const [editSearch, setEditSearch] = useState<SearchType[]>([{ field: "", condition: "contains", key: "", value: "=", ignoreCase: true }]);
    const [editIndex, setEditIndex] = useState<number>(0);

    useEffect(()=>{
        if (editIndexOrNewField === null) {
            return;
        }
        if (typeof editIndexOrNewField === "number") {
            setEditSearch(search);
            setEditIndex(editIndexOrNewField);
        }
        else {
            setEditSearch([...search, { field: editIndexOrNewField, condition: "contains", key: "", value: "", ignoreCase: true }]);
            setEditIndex(search.length);
        }
    }, [search, editIndexOrNewField]);

    if (editIndexOrNewField === null) {
        return null;
    }

    function renderCondition() {
        let conditions = [...filterOptions];
        if (!Feature.FILTER_ON_SERVER) {
            conditions = filterOptions.filter(fo => fo !== "raw" && fo !== "~");
        }
        return <TableRow>
            <TableCell>{t("dialog.searchFilter.label.condition")}</TableCell>
            <TableCell>
                <Select id="condition" value={editSearch[editIndex].condition} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    let newEditSearch: SearchType[] = [...editSearch];
                    newEditSearch[editIndex].condition = event.target.value as FilterCondition;
                    setEditSearch(newEditSearch);
                }}>
                    {conditions.map(fo => <SelectOption value={fo}>{t("dialog.searchFilter.options." + fo)}</SelectOption>)}
                </Select>
            </TableCell>
        </TableRow>
    }

    function renderField() {
        if (["search", "raw"].includes(editSearch[editIndex].condition)) {
            return null;
        }
        return <TableRow>
            <TableCell>{t("dialog.searchFilter.label.forField")}</TableCell>
            <TableCell>
                <Select id="field" value={editSearch[editIndex].field} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                    let newEditSearch: SearchType[] = [...editSearch];
                    newEditSearch[editIndex].field = event.target.value;
                    setEditSearch(newEditSearch);
                }}>
                    {Object.keys(fields).map(fo => <SelectOption value={fo}>{fo}</SelectOption>)}
                </Select>
                {editSearch[editIndex].field.indexOf("[]") !== -1 && editSearch[editIndex].condition !== "contains"}
            </TableCell>
        </TableRow>
    }

    function renderKey() {
        if (!editSearch[editIndex].field.endsWith(".*")) {
            return null;
        }
        return <TableRow>
            <TableCell>{t("dialog.searchFilter.label.key", { fieldname: editSearch[editIndex].field })}</TableCell>
            <TableCell>
                <TextField id="key" label="" value={editSearch[editIndex].key || ""} onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    let newEditSearch = [...editSearch];
                    newEditSearch[editIndex].key = event.currentTarget.value;
                    setEditSearch(newEditSearch);
                }} onKeyDown={event => {
                    if (event.key === "Enter") {
                        setSearch(editSearch);
                    }
                }} />
            </TableCell>
        </TableRow>
    }

    function renderIgnoreCase() {
        if (["search", "raw", "exists", "notExists"].includes(editSearch[editIndex].condition)) {
            return null;
        }
        return <TableRow>
            <TableCell>{t("dialog.searchFilter.label.ignoreCase")}</TableCell>
            <TableCell>
                <Checkboxes
                    items={[{
                        id: 'ignoreCase',
                        label: " ",
                        selected: editSearch[editIndex].ignoreCase
                    }]}
                    setItems={(items: { id: string; label?: string; selected?: boolean; }[]) => {
                        let newEditSearch = [...editSearch];
                        newEditSearch[editIndex].ignoreCase = !newEditSearch[editIndex].ignoreCase;
                        setEditSearch(newEditSearch);
                    }} />
            </TableCell>
        </TableRow>;
    }

    function renderValue() {
        if (["exists", "notExists"].includes(editSearch[editIndex].condition)) {
            return null;
        }
        return <TableRow>
            <TableCell>{t("dialog.searchFilter.label.value")}</TableCell>
            <TableCell>
                <TextField id="value" label="" value={editSearch[editIndex].value || ""} onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    let newEditSearch = [...editSearch];
                    newEditSearch[editIndex].value = event.currentTarget.value;
                    setEditSearch(newEditSearch);
                }} onKeyDown={event => {
                    if (event.key === "Enter") {
                        setSearch(editSearch);
                    }
                }} />
            </TableCell>
        </TableRow>
    }

    function getError() {
        if (["startsWith", "endsWith", "=", "!=", ">=", "<=", "~"].includes(editSearch[editIndex].condition)) {
            if (editSearch[editIndex].field.endsWith("[]")) {
                return t("dialog.searchFilter.label.arrayFieldRequiresContainsCondition");
            }
            else if (editSearch[editIndex].field.endsWith(".*") && !editSearch[editIndex].key) {
                return t("dialog.searchFilter.label.mapFieldRequiresContainsCondition");
            }
        }
        return "";
    }

    return (
        <DialogMaterial open={true} maxWidth="xl">
            <DialogTitle>{typeof editIndexOrNewField === "number" ? t("dialog.searchFilter.editTitle") : t("dialog.searchFilter.addTitle")}</DialogTitle>
            <DialogContent>
                <Table>
                    <TableHead>
                    </TableHead>
                    <TableBody>
                        {renderCondition()}
                        {renderField()}
                        {renderKey()}
                        {renderValue()}
                        {renderIgnoreCase()}
                    </TableBody>
                </Table>
                <div style={{ color: "red", fontWeight: "bold" }}>{getError()}</div>
    </DialogContent>
    <DialogActions>
        <Button
                    disabled={!!getError()}
            data-testid={"dialog_button_ok"}
                    onClick={async () => {
                setSearch(editSearch);
            }}
        >
                {t("button.ok")}
        </Button>
                <Button data-testid={"dialog_button_cancel"} onClick={() => {
                    setSearch(null);
                }}>Cancel</Button>
        </DialogActions>
        </DialogMaterial>);
}

export default withTranslation()(ListResourceFilter);
