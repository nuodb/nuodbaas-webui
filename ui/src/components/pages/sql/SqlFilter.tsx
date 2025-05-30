// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ChangeEvent, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import { withTranslation } from 'react-i18next';
import { ColumnMetaData, SqlResponse } from '../../../utils/SqlSocket';
import Select, { SelectOption } from '../../controls/Select';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

function sqlString(value: string) {
    return "'" + value.replaceAll("'", "''") + "'";
}

const FilterOptions: { id: string, label: string, string?: ((value: string) => string), number?: ((value: string) => string) }[] = [
    {
        id: "LIKE_PERCENT",
        label: "LIKE %...%",
        string: (value:string) => "LIKE " + sqlString("%" + value + "%")
    },
    {
        id: "LIKE",
        label: "LIKE",
        string: (value:string) => "LIKE " + sqlString(value)
    },
    {
        id: "NOT_LIKE_PERCENT",
        label: "NOT LIKE %...%",
        string: (value:string) => "NOT LIKE " + sqlString("%" + value + "%")
    },
    {
        id: "NOT_LIKE",
        label: "NOT LIKE",
        string: (value:string) => "NOT LIKE " + sqlString(value)
    },
    {
        id: "EQUAL",
        label: "=",
        string: (value:string) => "= " + sqlString(value),
        number: (value:string) => "= " + value
    },
    {
        id: "NOT_EQUAL",
        label: "!=",
        string: (value:string)=> "!= " + sqlString(value),
        number: (value:string)=> "!= " + value
    },
    {
        id: "REGEXP",
        label: "REGEXP",
        string: (value:string)=> "REGEXP " + sqlString(value)
    },
    {
        id: "REGEXP_BEGIN_END",
        label: "REGEXP ^...$",
        string: (value:string) => "REGEXP " + sqlString("^" + value + "$")
    },
    {
        id: "NOT_REGEXP",
        label: "NOT REGEXP",
        string: (value:string) => "NOT REGEXP " + sqlString(value)
    },
    {
        id: "IN",
        label: "IN (...)",
        string: (value: string) => (
            "IN ("
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .map(v => "'" + v.replaceAll("'", "''") + "'")
                .join(",")
            + ")"
        )
    },
    {
        id: "NOT_IN",
        label: "NOT IN (...)",
        string: (value: string) => (
            "NOT IN ("
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .map(v => "'" + v.replaceAll("'", "''") + "'")
                .join(",")
            + ")"
        )
    },
    {
        id: "BETWEEN",
        label: "BETWEEN",
        string: (value: string) => (
            "BETWEEN ("
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .map(v => "'" + v.replaceAll("'", "''") + "'")
                .join(" AND ")
            + ")"
        ),
        number: (value: string) => (
            "BETWEEN ("
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .join(" AND ")
            + ")"
        )
    },
    {
        id: "NOT_BETWEEN",
        label: "NOT BETWEEN",
        string: (value: string) => (
            "NOT BETWEEN ("
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .map(v => "'" + v.replaceAll("'", "''") + "'")
                .join(" AND ")
            + ")"
        ),
        number: (value: string) => (
            "NOT BETWEEN ("
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .join(" AND ")
            + ")"
        )
    },
];

export function filterToWhereClause(filter: SqlFilterType) : string {
    let ret = "";
    Object.keys(filter).forEach((key,index)=>{
        const oneFilter = FilterOptions.find(fo=>fo.id === filter[key].type);
        console.log("oneFilter", oneFilter, filter[key].type);
        if(oneFilter && oneFilter.string && filter[key].value) {
            if(ret) {
                ret += " AND ";
            }
            else {
                ret = " WHERE ";
            }
            ret += "`" + key + "` " + oneFilter.string(filter[key].value);
        }
    })
    console.log("filterToWhereClause", filter, ret);
    return ret;
}

export type SqlFilterType = {
    [name: string]: {
        type: string;
        value: string;
    }
}

type SqlFilterProps = {
    columns: ColumnMetaData[];
    filter: SqlFilterType;
    setFilter: (filter: SqlFilterType)=>void;
};

function SqlFilter({columns, filter, setFilter}: SqlFilterProps) {
    const [editFilter, setEditFilter] = useState<SqlFilterType>({});

    useEffect(() => {
        console.log("filter", filter);
        setEditFilter(JSON.parse(JSON.stringify(filter)));
    }, [columns]);

    return <DialogMaterial open={true}>
        <DialogTitle>Filter</DialogTitle>
    <DialogContent>

<Table>
        <TableHead>
            <TableRow>
                <TableTh>Field Name</TableTh>
                <TableTh>Condition</TableTh>
                <TableTh>Value</TableTh>
            </TableRow>
        </TableHead>
        <TableBody>
            {columns.map((column, index: number) => <TableRow key={index}>
                <TableCell>{column.name}</TableCell>
                <TableCell>
                    <Select id={column.name} value={editFilter[column.name]?.type || ""} onChange={(event: ChangeEvent<HTMLSelectElement>)=>{
                        let f = {...editFilter};
                        f[column.name] = {...f[column.name]};
                        f[column.name].type = event.target.value;
                        setEditFilter(f);
                    }}>
                        {FilterOptions.map(fo => <SelectOption value={fo.id}>{fo.label}</SelectOption>)}
                    </Select>
                </TableCell>
                <TableCell>
                    <TextField id={column.name} label="" value={editFilter[column.name]?.value || ""} onChange={(event: ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{
                        let f = {...editFilter};
                        f[column.name] = {...f[column.name]};
                        f[column.name].value = event.currentTarget.value;
                        setEditFilter(f);
                        console.log("F", f);
                    }}/>
                </TableCell>
            </TableRow>)}
        </TableBody>
    </Table>
    </DialogContent>
    <DialogActions>
        <Button data-testid={"dialog_button_ok"} onClick={() => {setFilter(editFilter)}}>Ok</Button>
        <Button data-testid={"dialog_button_cancel"} onClick={() => {setFilter(filter)}}>Cancel</Button>
        </DialogActions>
</DialogMaterial>;
}

export default withTranslation()(SqlFilter);
