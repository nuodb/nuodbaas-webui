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

export default class FieldArray {
    constructor(props) {
        this.props = props;
    }
    /**
     * show Field of type Array using the values and schema definition
     * @param prefix - contains field name (hierarchical fields are separated by period)
     * @param parameter - schema definition for this field
     * @param values - contains object with ALL values (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param errors - contains object with ALL errors (and field names) of this form (not just this field).
     *                 the key is the field name (name is separated by period if the field is hierarchical)
     * @param required
     * @param setValues - callback to update field value
     * @param onExit onExit callback. first argument is the field prefix
     * @returns
     */
    show() {
        const { prefix, parameter, values, errors, required, setValues, onExit } = this.props;
        let ret = [];
        let value = getValue(values, prefix);
        if (value !== null) {
            for (let i = 0; i < value.length; i++) {
                let prefixKey = prefix + "." + i;
                const field = new Field({
                    prefix: prefixKey, parameter: parameter.items, values, errors, required: (i === 0 && required), setValues: (vs) => {
                        vs = { ...vs };
                        let v = getValue(values, prefixKey);
                        setValue(vs, prefixKey, v === "" ? null : v);
                        setValues(vs)
                    }, onExit
                });
                ret.push(<TableRow key={prefixKey}>
                    <TableCell>
                        {field.show()}
                    </TableCell>
                </TableRow>);
            }
        }

        let nextIndex = value === null ? 0 : value.length;
        let prefixKey = prefix + "." + nextIndex;
        let field = new Field({
            prefix: prefixKey, parameter: parameter.items, values, setValues: (vs) => {
                vs = { ...vs };
                let v = getValue(values, prefixKey);
                setValue(vs, prefixKey, v === "" ? null : v);
                setValues(vs);
        }
        });
        ret.push(<TableRow key={prefixKey}>
            <TableCell>
                {field.show()}
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
}