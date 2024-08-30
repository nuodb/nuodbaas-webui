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
import FieldBase from "./FieldBase"

export default class FieldMap extends FieldBase {

    validateNewKey() {
        const { prefix, parameter, updateErrors } = this.props;
        let prefixKeyLabel = prefix + ".key";
        let prefixValueLabel = prefix + ".value";
        let keyElement = document.getElementById(prefixKeyLabel);
        let valueElement = document.getElementById(prefixValueLabel);
        if ((keyElement && keyElement.value !== "") || (valueElement && valueElement.value !== "")) {
            return super.validate(prefixKeyLabel, parameter, keyElement.value);
        }

        updateErrors(prefixKeyLabel, null);
        updateErrors(prefixValueLabel, null);
        return true;
    }

    validateNewValue() {
        const { prefix, parameter, updateErrors } = this.props;
        let prefixKeyLabel = prefix + ".key";
        let prefixValueLabel = prefix + ".value";
        let keyElement = document.getElementById(prefixKeyLabel);
        let valueElement = document.getElementById(prefixValueLabel);
        if ((keyElement && keyElement.value !== "") || (valueElement && valueElement.value !== "")) {
            return super.validate(prefixValueLabel, parameter["additionalProperties"], valueElement.value);
        }

        updateErrors(prefixKeyLabel, null);
        updateErrors(prefixValueLabel, null);
        return true;
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
     * @returns
     */
    show() {
        const { prefix, values, errors, setValues } = this.props;

        let valueKeys = Object.keys(getValue(values, prefix) || {});
        let rows = [];
        for (let i = 0; i < valueKeys.length; i++) {
            let prefixKeyLabel = prefix + "." + i + ".key";
            let prefixKeyValue = prefix + "." + i + ".value";
            let prefixKey = prefix + "." + valueKeys[i];
            let errorValue = (errors && (prefixKeyValue in errors) && errors[prefixKeyValue]) || "";
            rows.push(<TableRow key={prefixKeyLabel} className="verticalAlignTop">
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
                        onBlur={event => this.validate(prefixKeyValue)} />
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
        rows.push(<TableRow key={prefixKeyLabel} className="verticalAlignTop">
            <TableCell>
                <TextField
                    fullWidth={true}
                    id={prefixKeyLabel}
                    name={prefixKeyLabel}
                    label={"new key"}
                    defaultValue=""
                    onBlur={() => this.validateNewKey()}
                    error={errorKey !== ""} helperText={errorKey} />
            </TableCell>
            <TableCell>
                <TextField
                    fullWidth={true}
                    id={prefixValueLabel}
                    name={prefixValueLabel}
                    label={"new value"}
                    defaultValue=""
                    onBlur={() => this.validateNewValue()}
                    error={errorValue !== ""} helperText={errorValue} />
            </TableCell>
            <TableCell>
                <Button data-testid={"add_button_" + prefix} onClick={() => {
                    let keyElement = document.getElementById(prefixKeyLabel);
                    let valueElement = document.getElementById(prefixValueLabel);
                    if (keyElement.value === "" && valueElement.value === "") {
                        return;
                    }

                    if (!this.validateNewKey() || !this.validateNewValue()) {
                        return;
                    }

                    let value = getValue(values, prefix);
                    if (value === null) {
                        value = {};
                    }
                    value = { ...value };
                    value[keyElement.value] = valueElement.value;
                    keyElement.value = "";
                    valueElement.value = "";
                    setValue(values, prefix, value);
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

    validate() {
        const { prefix, parameter, values } = this.props;

        let value = values[prefix];
        let success = true;
        if (value && parameter["additionalProperties"]) {
            let value = getValue(values, prefix);
            if (value) {
                Object.values(value).forEach((v, index) => {
                    const fieldKey = prefix + "." + index + ".value";
                    success = super.validate(fieldKey, parameter["additionalProperties"], v) && success;
                })
            }
        }
        success = this.validateNewKey() && success;
        success = this.validateNewValue() && success;
        return success;
    }

    getDisplayValue() {
        const { prefix, parameter, values } = this.props;
        const value = getValue(values, prefix);
        return <dl className="map">{Object.keys(value).map(key => {
            const field = FieldFactory.create({ prefix: prefix + "." + key, parameter: parameter[key], values });
            return <div key={key}><dt>{String(key)}</dt><dd>{field.getDisplayValue()}</dd></div>;
        })}</dl>
    }
}