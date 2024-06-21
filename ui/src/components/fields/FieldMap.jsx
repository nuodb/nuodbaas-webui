import React, { useState } from "react";
import Field from "./Field";
import { getDefaultValue } from "../../utils/schema";
import { setValue, getValue } from "./utils";
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

/**
 * show Field of type Object using the values and schema definition
 * @param prefix - contains field name (hierarchical fields are separated by period)
 * @param parameter - schema definition for this field
 * @param values - contains object with ALL values (and field names) of this form (not just this field).
 *                 the key is the field name (name is separated by period if the field is hierarchical)
 * @param setValues - callback to update field values
 * @returns
 */
export default function FieldMap({ prefix, parameter, values, setValues }) {
    const [newKey, setNewKey] = useState("");

    let valueKeys = Object.keys(getValue(values, prefix) || {});
    let rows = [];
    for (let i = 0; i < valueKeys.length; i++) {
        let prefixKeyLabel = prefix + "." + i + ".key";
        let prefixKeyValue = prefix + "." + i + ".value";
        let prefixKey = prefix + "." + valueKeys[i];
        rows.push(<TableRow key={prefixKeyLabel}>
            <TableCell>
                <TextField
                    fullWidth={true}
                    disabled={true}
                    id={prefixKeyLabel}
                    name={prefixKeyLabel}
                    label={prefixKeyLabel}
                    value={valueKeys[i]} />
            </TableCell>
            <TableCell>
                <TextField
                    fullWidth={true}
                    id={prefixKeyValue}
                    name={prefixKeyValue}
                    label={prefixKeyValue}
                    value={getValue(values, prefix)[valueKeys[i]]}
                    onChange={({ currentTarget: input }) => {
                        let v = { ...values };
                        setValue(v, prefixKey, input.value);
                        setValues(v)
                    }} />
            </TableCell>
            <TableCell><Button onClick={() => {
                let v = { ...values };
                setValue(v, prefixKey, null);
                setValues(v);
            }}>Delete</Button></TableCell>
        </TableRow>);
    }

    let prefixParts = prefix.split(".");
    let lastPrefix = prefixParts[prefixParts.length - 1];

    let prefixKeyLabel = prefix + ".new";
    rows.push(<TableRow key={prefixKeyLabel}>
        <TableCell>
            <TextField
                fullWidth={true}
                id={prefixKeyLabel}
                name={prefixKeyLabel}
                label={"new item"}
                value={newKey}
                onChange={({ currentTarget: input }) => {
                    setNewKey(input.value);
                }} />
        </TableCell>
        <TableCell>
            <Button onClick={() => {
                let value = getValue(values, prefix);
                if (value === null) {
                    value = {};
                }
                value = { ...value };
                value[newKey] = "";
                setNewKey("");
                setValue(values, prefix, value);
                setValues(values);
            }}>Add</Button>
        </TableCell>
        <TableCell></TableCell>
    </TableRow>);

    return (
        <TableContainer component={Card}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>{lastPrefix} Key</TableCell>
                        <TableCell>{lastPrefix} Value</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
