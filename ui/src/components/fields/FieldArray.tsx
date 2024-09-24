// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { ReactNode } from "react";
import { setValue, getValue } from "./utils";
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FieldBase from './FieldBase'
import FieldFactory from "./FieldFactory"
import FieldMessage from "./FieldMessage";

export default class FieldArray extends FieldBase {
    /**
     * show Field of type Array using the values and schema definition
     * @returns
     */
    show() {
        const { prefix, parameter, values, errors, required, setValues, updateErrors, readonly } = this.props;
        if (!parameter.items) {
            return new FieldMessage({ ...this.props, message: "\"items\" attribute missing in schema definition" }).show();
        }
        let ret = [];
        let value = getValue(values, prefix);
        if (value !== null) {
            for (let i = 0; i < value.length; i++) {
                let prefixKey = prefix + "." + i;
                const field = FieldFactory.create({
                    ...this.props,
                    prefix: prefixKey, parameter: parameter.items, values, errors, required: (i === 0 && required), setValues: (vs) => {
                        vs = { ...vs };
                        let v = getValue(values, prefixKey);
                        setValue(vs, prefixKey, v === "" ? null : v);
                        setValues(vs)
                    }, updateErrors
                });
                ret.push(<TableRow key={prefixKey}>
                    <TableCell>
                        {field.show()}
                    </TableCell>
                </TableRow>);
            }
        }

        if (!readonly) {
            let nextIndex = value === null ? 0 : value.length;
            let prefixKey = prefix + "." + nextIndex;
            let field = FieldFactory.create({
                ...this.props,
                prefix: prefixKey, parameter: parameter.items, values, setValues: (vs) => {
                    vs = { ...vs };
                    let v = getValue(values, prefixKey);
                    setValue(vs, prefixKey, v === "" ? null : v);
                    setValues(vs);
                }, updateErrors
            });
            ret.push(<TableRow key={prefixKey}>
                <TableCell>
                    {field.show()}
                </TableCell>
            </TableRow>);
        }

        return <TableContainer key={prefix} component={Card}>
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

    getDisplayValue(): ReactNode {
        const { prefix, values } = this.props;
        const value = getValue(values, prefix);
        return value && value.map((v: string, index: number) => <div key={index}>{v}</div>);
    }
}
