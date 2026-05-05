// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import React, { ChangeEvent, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableTh } from '../../controls/Table';
import { withTranslation } from 'react-i18next';
import { ColumnMetaData } from '../../../utils/SqlSocket';
import Select, { SelectOption } from '../../controls/Select';
import TextField from '../../controls/TextField';
import Button from '../../controls/Button';
import DialogMaterial from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { t } from 'i18next';
import { sqlString } from './SqlUtils';

const FilterOptions: { id: string, label: string, string?: ((value: string) => string), number?: ((value: string) => string), boolean?: ((value: string) => string) }[] = [
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
        number: (value: string) => "= " + value,
        boolean: (value: string) => "= " + value
    },
    {
        id: "NOT_EQUAL",
        label: "!=",
        string: (value:string)=> "!= " + sqlString(value),
        number: (value: string) => "!= " + value,
        boolean: (value: string) => "!= " + value
    },
    {
        id: "GREATER",
        label: ">",
        number: (value: string) => "> " + value
    },
    {
        id: "GREATER_EQUAL",
        label: ">=",
        number: (value: string) => ">= " + value
    },
    {
        id: "LESS",
        label: "<",
        number: (value: string) => "< " + value,
    },
    {
        id: "LESS_EQUAL",
        label: "<=",
        number: (value: string) => "<= " + value
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
            "BETWEEN "
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .map(v => "'" + v.replaceAll("'", "''") + "'")
                .join(" AND ")
        ),
        number: (value: string) => (
            "BETWEEN "
            + value.split(",")
                .map(v => v.trim())
                .filter(v => v != "")
                .join(" AND ")
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

function isNumber(sqlType: string) {
    return ["BIGINT", "BIT", "DECIMAL", "DOUBLE", "FLOAT", "INTEGER", "NUMERIC", "SMALLINT", "TINYINT"].includes(sqlType.toUpperCase());
}

function isString(sqlType: string) {
    return ["CHAR", "DATE", "LONGNVARCHAR", "LONGVARCHAR", "NCHAR", "NVARCHAR", "TIME", "TIME_WITH_TIMEZONE", "TIMESTAMP", "TIMESTAMP_WITH_TIMEZONE", "VARCHAR"].includes(sqlType.toUpperCase());
}

function isBoolean(sqlType: string) {
    return "BOOLEAN" === sqlType.toUpperCase();
}

// SQL types being neither a number or string - not supported for filtering
// ARRAY
// BINARY
// BLOB
// CLOB
// DATALINK
// DISTINCT
// JAVA_OBJECT
// LONGVARBINARY
// NCLOB
// NULL
// OTHER
// REAL
// REF
// REF_CURSOR
// ROWID
// SQLXML
// STRUCT
// VARBINARY


export function filterToWhereClause(columns: ColumnMetaData[], filter: SqlFilterType): string {
    let ret = "";
    Object.keys(filter).forEach(key => {
        const sqlType = columns?.find(c => c.name === key)?.type || "";
        const oneFilter = FilterOptions.find(fo => fo.id === filter[key].type);
        const convertFunc = (isString(sqlType) && oneFilter?.string) || (isNumber(sqlType) && oneFilter?.number) || (isBoolean(sqlType) && oneFilter?.boolean);
        if (convertFunc && filter[key].value) {
            if(ret) {
                ret += " AND ";
            }
            else {
                ret = " WHERE ";
            }
            ret += "`" + key + "` " + convertFunc(filter[key].value);
        }
    })
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
    setFilter: (filter: SqlFilterType | undefined) => void;
};

export function getFilterConditionOptions(columnType: string) {
    return FilterOptions
        .filter(fo => (
            fo.boolean && isBoolean(columnType)
            || fo.string && isString(columnType)
            || fo.number && isNumber(columnType)
        ))
}

function SqlFilter({columns, filter, setFilter}: SqlFilterProps) {
    const [editFilter, setEditFilter] = useState<SqlFilterType>({});

    useEffect(() => {
        setEditFilter(JSON.parse(JSON.stringify(filter)));
    }, [columns]);

    return <DialogMaterial open={true}>
        <DialogTitle>Filter</DialogTitle>
    <DialogContent>

<Table>
        <TableHead>
            <TableRow>
                <TableTh>{t("form.sqleditor.label.fieldName")}</TableTh>
                        <TableTh>{t("form.sqleditor.label.dataType")}</TableTh>
                <TableTh>{t("form.sqleditor.label.condition")}</TableTh>
                <TableTh>{t("form.sqleditor.label.value")}</TableTh>
            </TableRow>
        </TableHead>
        <TableBody>
            {columns.map((column, index: number) => <TableRow key={index}>
                <TableCell>{column.name}</TableCell>
                <TableCell>{column.type}</TableCell>
                <TableCell>
                    <Select id={column.name} value={editFilter[column.name]?.type || ""} onChange={(event: ChangeEvent<HTMLSelectElement>)=>{
                        let f = {...editFilter};
                        f[column.name] = {...f[column.name]};
                        f[column.name].type = event.target.value;
                        setEditFilter(f);
                    }}>
                        {getFilterConditionOptions(column.type)
                            .map(fo => <SelectOption value={fo.id}>{fo.label}</SelectOption>)
                        }
                    </Select>
                </TableCell>
                <TableCell>
                    {column.type === "BOOLEAN"
                        ?
                        <Select id={column.name} label="" value={editFilter[column.name]?.value || ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                            let f = { ...editFilter };
                            f[column.name] = { ...f[column.name] };
                            f[column.name].value = event.target.value;
                            setEditFilter(f);
                        }}>
                            <SelectOption value="">{t("button.unassigned")}</SelectOption>
                            <SelectOption value="false">{t("button.false")}</SelectOption>
                            <SelectOption value="true">{t("button.true")}</SelectOption>
                        </Select>
                        :
                        <TextField id={column.name} label="" value={editFilter[column.name]?.value || ""} onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            let f = { ...editFilter };
                            f[column.name] = { ...f[column.name] };
                            f[column.name].value = event.currentTarget.value;
                            setEditFilter(f);
                        }} />
                    }
                </TableCell>
            </TableRow>)}
        </TableBody>
    </Table>
    </DialogContent>
    <DialogActions>
        <Button data-testid={"dialog_button_ok"} onClick={() => {setFilter(editFilter)}}>{t("button.ok")}</Button>
            <Button data-testid={"dialog_button_cancel"} onClick={() => { setFilter(undefined) }}>{t("button.cancel")}</Button>
        </DialogActions>
</DialogMaterial>;
}

export default withTranslation()(SqlFilter);
