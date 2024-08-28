import React from "react";
import { setValue, getValue } from "./utils";
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Field from './Field'

/**
 * show Field of type Array using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param setValues - callback to update field values
 * @returns
 */
export default function FieldArray({ prefix, parameter, values, setValues }) {
    let ret = [];
    let value = getValue(values, prefix);
    if (value !== null) {
        for (let i = 0; i < value.length; i++) {
            let prefixKey = prefix + "." + i;
            ret.push(<TableRow key={prefixKey}>
                <TableCell>
                    <Field key={prefixKey} prefix={prefixKey} parameter={parameter.items} values={values} setValues={(vs) => {
                        vs = { ...vs };
                        let v = getValue(values, prefixKey);
                        setValue(vs, prefixKey, v === "" ? null : v);
                        setValues(vs)
                    }} />
                </TableCell>
            </TableRow>);
        }
    }

    let nextIndex = value === null ? 0 : value.length;
    let prefixKey = prefix + "." + nextIndex;
    ret.push(<TableRow key={prefixKey}>
        <TableCell>
            <Field key={prefixKey} prefix={prefixKey} parameter={parameter.items} values={values} setValues={(vs) => {
                vs = { ...vs };
                let v = getValue(values, prefixKey);
                setValue(vs, prefixKey, v === "" ? null : v);
                setValues(vs);
            }} />
        </TableCell>
    </TableRow>);

    return <TableContainer component={Card}>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>{prefix.split(".").slice(-1)[0]}</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {ret}
            </TableBody>
        </Table>
    </TableContainer>;
}
