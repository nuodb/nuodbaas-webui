// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { ChangeEvent, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../controls/Table';
import { withTranslation } from 'react-i18next';
import Select, { SelectOption } from '../controls/Select';
import TextField from '../controls/TextField';
import Button from '../controls/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { t } from 'i18next';
import { getChild, getCreatePath, getResourceByPath, getSchema, getSchemaPath } from '../../utils/schema';
import { TempAny } from '../../utils/types';

type FilterType = "NON_NULL" | "NULL" | "=" | "!=" | ">=" | "<=" | "~";

const filterOptions: { id: FilterType, label: string}[] = [
    {
        id: "NON_NULL",
        label: "exists",
    },
    {
        id: "NULL",
        label: "does not exist",
    },
    {
        id: "=",
        label: "equals",
    },
    {
        id: "!=",
        label: "not equals",
    },
    {
        id: ">=",
        label: "greater or equal to",
    },
    {
        id: "<=",
        label: "less or equal to",
    },
    {
        id: "~",
        label: "regular expression",
    },
];

function getFieldsByPath(schema: TempAny, path: string) {
    function getFields(definition: any, prefix: string, outFields: {[key:string]:string}) {
        Object.keys(definition).forEach(key => {
            const type = definition[key].type;
            if(type === "object") {
                if(definition[key].additionalProperties) {
                    const apType = definition[key].additionalProperties.type;
                    if(apType === "string" || apType === "boolean" || apType === "integer") {
                        outFields[prefix + key] = apType;
                    }
                    else {
                        console.log("INVALID additionalProperties type", definition[key], key, type);
                    }
                }
                else if(definition[key].properties) {
                    getFields(definition[key].properties, key + ".", outFields);
                }
                else {
                    console.log("INVALID OBJECT", definition, prefix, path);
                }
            }
            else if(type === "string" || type === "boolean" || type === "integer") {
                outFields[prefix + key] = type;
            }
            else {
                console.log("INVALID TYPE", definition, key, prefix, definition[key].type);
            }
        })
    }

    let fields: {[key:string]:string} = {};
    const resource = getResourceByPath(schema, getCreatePath(schema, path));
    if(resource["put"]) {
        const formParams = getChild(resource["get"], ["responses", "200", "content", "application/json", "schema", "properties"])
        getFields(formParams, "", fields);
    }
    return fields;
}

export type ListResourceFilterType = {
    name: string;
    type: FilterType;
    value: string;
};

type ListResourceFilterProps = {
    path: string;
    show: boolean;
    setShow: (show: boolean) => void;
    search: string;
    setSearch: (filter: string) => void;
};

function ListResourceFilter({path, show, setShow, search, setSearch}: ListResourceFilterProps) {
    const [editFilter, setEditFilter] = useState<ListResourceFilterType[]>([]);
    const [fields, setFields] = useState<string[]>([]);

    useEffect(()=>{
        getSchema().then(schema => {
            let fields = getFieldsByPath(schema, path);
            setFields(Object.keys(fields));
        });
    },[]);

    useEffect(()=>{
        const comparators: FilterType[] = [">=",">=","!=", "=", "~"];
        let editFilter: ListResourceFilterType[] = [];
        const parts = search.split(",");
        for(let s=0; s<parts.length; s++) {
            const part = parts[s].trim();
            if(!part) {
                continue;
            }
            let found = false;
            for(let c=0; c<comparators.length; c++) {
                const comparator = comparators[c];
                if(part.includes(comparator)) {
                    found = true;
                    const pos = part.indexOf(comparator);
                    editFilter.push({
                        name: part.substring(0, pos),
                        type: comparator,
                        value: part.substring(pos + comparator.length)
                    });
                    break;
                }
            }
            if(!found) {
                if(part.startsWith("!")) {
                    editFilter.push({
                        name: part.substring(1),
                        type: "NULL",
                        value: ""
                    });
                }
                else {
                    editFilter.push({
                        name: part,
                        type: "NON_NULL",
                        value: ""
                    });
                }
            }
        }
        setEditFilter(editFilter);
    }, [search])

    if(!show) {
        return null;
    }

    let unusedFields: Set<string> = new Set(fields);
    editFilter.forEach(ef => {
        unusedFields.delete(ef.name);
    })

    return <DialogMaterial open={true}>
        <DialogTitle>Search Filter</DialogTitle>
    <DialogContent>

<Table>
        <TableHead>
            <TableRow>
                <TableTh>{t("form.sqleditor.label.fieldName")}</TableTh>
                <TableTh>{t("form.sqleditor.label.condition")}</TableTh>
                <TableTh>{t("form.sqleditor.label.value")}</TableTh>
                <TableTh></TableTh>
            </TableRow>
        </TableHead>
        <TableBody>
            {editFilter.map((ef, index: number) => <TableRow key={ef.name}>
                <TableCell>{ef.name}</TableCell>
                <TableCell>
                    <Select id={ef.name} value={ef.type} onChange={(event: ChangeEvent<HTMLSelectElement>)=>{
                        let f: ListResourceFilterType[] = [...editFilter];
                        f[index].type = event.target.value as FilterType;
                        setEditFilter(f);
                    }}>
                        {filterOptions.map(fo => <SelectOption value={fo.id}>{fo.label}</SelectOption>)}
                    </Select>
                </TableCell>
                <TableCell>
                    <TextField id={ef.name} label="" value={ef.value || ""} onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                        let f = [ ...editFilter ];
                        f[index].value = event.currentTarget.value;
                        setEditFilter(f);
                    }} />
                </TableCell>
                <TableCell>
                    <div className="NuoColumn" onClick={()=>{
                        let f = [...editFilter];
                        f.splice(index, 1);
                        setEditFilter(f);
                    }}>
                        <DeleteIcon />
                    </div>
                </TableCell>
            </TableRow>)}
            <TableRow><TableCell>
                <div className="NuoRow">
                    Add Field:
                    <Select id="new.resource.filter" value="" onChange={(event: ChangeEvent<HTMLSelectElement>)=>{
                        let f: ListResourceFilterType[] = [...editFilter];
                        f.push({name: event.target.value, type: "=", value: ""});
                        setEditFilter(f);
                    }}>
                        {Array.from(unusedFields).map(field => <SelectOption value={field}>{field}</SelectOption>)}
                    </Select>
                </div>
            </TableCell></TableRow>
        </TableBody>
    </Table>
    </DialogContent>
    <DialogActions>
        <Button
            data-testid={"dialog_button_ok"}
            onClick={() => {
                let search: string[] = [];
                editFilter.map((ef,index)=>{
                    if(ef.type === "NULL") {
                        search.push("!" + ef.name);
                    }
                    else if(ef.type === "NON_NULL") {
                        search.push(ef.name);
                    }
                    else if(ef.value !== "") {
                        search.push(ef.name + ef.type + ef.value);
                    }
                })
                setSearch(search.join(","));
                setShow(false);
            }}
        >
                {t("button.ok")}
        </Button>
            <Button data-testid={"dialog_button_cancel"} onClick={() => { setShow(false)}}>{t("button.cancel")}</Button>
        </DialogActions>
</DialogMaterial>;
}

export default withTranslation()(ListResourceFilter);
