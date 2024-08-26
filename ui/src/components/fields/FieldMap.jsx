import React from "react";
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

export default class FieldMap {
    constructor(props) {
        this.props = props;
    }

    /**
     * show Field of type Object using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required - does this field require a value?
     * @param setValues - callback to update field value
     * @param onExit onExit callback. The field prefix is passed in as first argument
     * @returns
     */
    show() {
        const { prefix, values, errors, setValues, onExit } = this.props;

        let valueKeys = Object.keys(getValue(values, prefix) || {});
        let rows = [];
        for (let i = 0; i < valueKeys.length; i++) {
            let prefixKeyLabel = prefix + "." + i + ".key";
            let prefixKeyValue = prefix + "." + i + ".value";
            let prefixKey = prefix + "." + valueKeys[i];
            let errorValue = (errors && (prefixKeyValue in errors) && errors[prefixKeyValue]) || "";
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
                        }}
                        error={errorValue !== ""}
                        helperText={errorValue}
                        onBlur={event => onExit && onExit(prefixKeyValue)} />
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
        let errorKey = (errors && (prefixKeyLabel in errors) && errors[prefixKeyLabel]) || "";
        let errorValue = (errors && (prefixValueLabel in errors) && errors[prefixValueLabel]) || "";
        rows.push(<TableRow key={prefixKeyLabel}>
            <TableCell>
                <TextField
                    fullWidth={true}
                    id={prefixKeyLabel}
                    name={prefixKeyLabel}
                    label={"new key"}
                    defaultValue=""
                    error={errorKey !== ""} helperText={errorKey} />
            </TableCell>
            <TableCell>
                <TextField
                    fullWidth={true}
                    id={prefixValueLabel}
                    name={prefixValueLabel}
                    label={"new value"}
                    defaultValue=""
                    error={errorValue !== ""} helperText={errorValue} />
            </TableCell>
            <TableCell>
                <Button data-testid={"add_button_" + prefix} onClick={() => {
                    let keyElement = document.getElementById(prefixKeyLabel);
                    let valueElement = document.getElementById(prefixValueLabel);
                    if (keyElement.value === "" && valueElement.value === "") {
                        console.log("empty");
                        return;
                    }

                    const successKeyField = onExit(prefixKeyLabel);
                    const successValueField = onExit(prefixValueLabel);
                    if (!successKeyField || !successValueField) {
                        console.log("failed");
                        return;
                    }
                    console.log("A");

                    let value = getValue(values, prefix);
                    if (value === null) {
                        value = {};
                    }
                    value = { ...value };
                    value[keyElement.value] = valueElement.value;
                    keyElement.value = "";
                    valueElement.value = "";
                    setValue(values, prefix, value);
                    console.log("Values", values);
                    setValues(values);
                }}>Add</Button>
            </TableCell>
        </TableRow>);

        return (
            <TableContainer key={prefix} component={Card}>
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
}