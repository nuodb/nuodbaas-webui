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

const filterOptions = ["contains", "startsWith", "endsWith", "exists", "notExists", "=", "!=", ">=", "<=", "~", "raw"] as const;
export type FilterCondition = typeof filterOptions[number];

export type SearchType = {
    field: string;
    condition: FilterCondition;
    value: string;
    ignoreCase: boolean;
};

function escapeRegex(value: string) {
    // Matches all special regex characters and prepends them with a backslash
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getFieldFilter(search: SearchType) {
    const fieldRegex = "{" + escapeRegex(search.field) + "}";
    const namePrefix = fieldRegex + "~" + (search.ignoreCase ? "(?i)" : "");
    switch (search.condition) {
        case "contains":
            return namePrefix + ".*" + escapeRegex(search.value) + ".*";
        case "startsWith":
            return namePrefix + escapeRegex(search.value) + ".*";
        case "endsWith":
            return namePrefix + ".*" + escapeRegex(search.value);
        case "exists":
            return search.field;
        case "notExists":
            return "!" + search.field;
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
        case "contains":
            return search.field + "=*" + search.value + "*";
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
    search: SearchType[];
    setSearch: (filter: SearchType[] | null) => void;
};

function ListResourceFilter({ editIndexOrNewField, search, setSearch }: ListResourceFilterProps) {
    const [editSearch, setEditSearch] = useState<SearchType[]>([{ field: "", condition: "contains", value: "=", ignoreCase: true }]);
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
            setEditSearch([...search, { field: editIndexOrNewField, condition: "contains", value: "", ignoreCase: true }]);
            setEditIndex(search.length);
        }
    }, [search, editIndexOrNewField]);

    if (editIndexOrNewField === null) {
        return null;
    }

    return (
        <DialogMaterial open={true}>
            <DialogTitle>{t("dialog.searchFilter.title")}</DialogTitle>
            <DialogContent style={{ width: "90%" }}>
                <Table>
                    <TableHead>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>{t("dialog.searchFilter.label.fieldName")}</TableCell>
                            <TableCell>
                                {editSearch[editIndex].field}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>{t("dialog.searchFilter.label.condition")}</TableCell>
                            <TableCell>
                                <Select id="condition" value={editSearch[editIndex].condition} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                    let newEditSearch: SearchType[] = [...editSearch];
                                    newEditSearch[editIndex].condition = event.target.value as FilterCondition;
                                    setEditSearch(newEditSearch);
                                }}>
                                    {filterOptions.map(fo => <SelectOption value={fo}>{t("dialog.searchFilter.options." + fo)}</SelectOption>)}
                                </Select>
                            </TableCell>
                        </TableRow>
                        {editSearch[editIndex].condition !== "raw" && <TableRow>
                            <TableCell>{t("dialog.searchFilter.label.ignoreCase")}</TableCell>
                            <TableCell>
                                <Checkboxes
                                    items={[{
                                        id: 'ignoreCase',
                                        selected: editSearch[editIndex].ignoreCase
                                    }]}
                                    setItems={(items: { id: string; label?: string; selected?: boolean; }[]) => {
                                        let newEditSearch = [...editSearch];
                                        newEditSearch[editIndex].ignoreCase = !items[0].selected;
                                        setEditSearch(newEditSearch);
                                    }} />
                            </TableCell>
                        </TableRow>}
                        <TableRow>
                            <TableCell>{t("dialog.searchFilter.label.value")}</TableCell>
                            <TableCell>
                                <TextField id="value" label="" value={editSearch[editIndex].value || ""} onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                                    let newEditSearch = [...editSearch];
                                    newEditSearch[editIndex].value = event.currentTarget.value;
                                    setEditSearch(newEditSearch);
                                }} />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
    </DialogContent>
    <DialogActions>
        <Button
            data-testid={"dialog_button_ok"}
            onClick={() => {
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
