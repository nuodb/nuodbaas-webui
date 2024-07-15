import React, { useState } from "react";
import { setValue, getValue } from "./utils";
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

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
    const [newValue, setNewValue] = useState("");

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

    let prefixKeyLabel = prefix + ".key";
    let prefixValueLabel = prefix + ".value"
    rows.push(<TableRow key={prefixKeyLabel}>
        <TableCell>
            <TextField
                fullWidth={true}
                id={prefixKeyLabel}
                name={prefixKeyLabel}
                label={"new key"}
                value={newKey}
                onChange={({ currentTarget: input }) => {
                    setNewKey(input.value);
                }} />
        </TableCell>
        <TableCell>
            <TextField
                fullWidth={true}
                id={prefixValueLabel}
                name={prefixValueLabel}
                label={"new value"}
                value={newValue}
                onChange={({ currentTarget: input }) => {
                    setNewValue(input.value);
                }} />
        </TableCell>
        <TableCell>
            <Button disabled={newKey === "" || valueKeys.includes(newKey)} onClick={() => {
                let value = getValue(values, prefix);
                if (value === null) {
                    value = {};
                }
                value = { ...value };
                value[newKey] = newValue;
                setNewKey("");
                setNewValue("");
                setValue(values, prefix, value);
                setValues(values);
            }}>Add</Button>
        </TableCell>
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
